export type Error = string | null;
export type FSM_Option<Actions, Value> = {
  prefix?: string;
  validateMap?: ValidateMap<Actions, Value>;
};

export type StateFunction<Value, States> = (
  state: Value
) => Extract<keyof States, string>;
type ActionFunction<Value, Payload> = (state: Value, action: Payload) => Value;
type ValidateFunction<Value, Payload> = (
  state: Value,
  action: Payload
) => string | null;

export type StateMap<States, Value> = {
  start: {
    status: Extract<keyof States, string>;
    value: Value;
  };
  states: {
    [key in keyof States]: {
      [actionKey in keyof States[key]]:
        | StateFunction<Value, States>
        | Extract<keyof States, string>
    }
  };
};

export type ActionMap<Actions, Value> = {
  [key in Extract<keyof Actions, string>]: ActionFunction<Value, Actions[key]>
};

export type ValidateMap<Actions, Value> = {
  [key in Extract<keyof Actions, string>]?: ValidateFunction<
    Value,
    Actions[key]
  >
};

export type State<States, Value> = {
  status: Extract<keyof States, string>;
  value: Value;
};

export type Action<Actions> = {
  type: Extract<keyof Actions, string>;
  [key: string]: any;
};

function makeFSM<States, Actions, Value>(
  stateMap: StateMap<States, Value>,
  actionMap: ActionMap<Actions, Value>,
  opts: FSM_Option<Actions, Value> = {}
): {
  reducer: (
    state: State<States, Value>,
    actionObj: Action<Actions>
  ) => State<States, Value>;
  getActions: () => string[];
  getActionsWithState: (state: State<States, Value>) => string[];
  getValidateError: () => Error;
  validate: (state: State<States, Value>, actionObj: Action<Actions>) => Error;
} {
  const { validateMap = {} } = opts;
  const initState: State<States, Value> = {
    status: stateMap.start.status,
    value: stateMap.start.value
  };

  let currentStatus = stateMap.start.status;
  let validateError: Error = null;

  const isAvailableStatus = (
    stateMap: any,
    status: string
  ): status is Extract<keyof States, string> =>
    stateMap.states[status] !== undefined;

  function getHandler(
    handles: ActionMap<Actions, Value>,
    handlerName: Extract<keyof Actions, string>
  ): ActionFunction<Value, any>;
  function getHandler(
    handles: ValidateMap<Actions, Value>,
    handlerName: Extract<keyof Actions, string>
  ): ValidateFunction<Value, any> | undefined;
  function getHandler(
    handles: StateMap<States, Value>,
    handlerName: Extract<keyof Actions, string>,
    status: Extract<keyof States, string>
  ): StateFunction<Value, States> | Extract<keyof States, string>;
  function getHandler(handles: any, handlerName: any, status?: any): any {
    if (handles.states) {
      return handles.states[status][handlerName];
    }
    return handles[handlerName];
  }

  function transit(
    state: Value,
    handler: string | StateFunction<Value, States>
  ): Extract<keyof States, string> {
    if (typeof handler === 'function') {
      return handler(state);
    } else if (isAvailableStatus(stateMap, handler)) {
      return handler;
    }
    {
      throw new Error(
        `Invalid handler detected for transit: ${JSON.stringify(handler)}`
      );
    }
  }

  // reducer: (state: State<States, Value>, actionObj: Action<Actions>) => State<States, Value>;
  const reducer = (
    state: State<States, Value> = initState,
    actionObj: Action<Actions>
  ): State<States, Value> => {
    const { type } = actionObj;
    const { status, value } = state;

    const stateHandler = getHandler(stateMap, type, status);
    if (!stateHandler) {
      const msg = `action ${type} is not available for status ${status}`;
      validateError = msg;
      return state;
    }

    const actionHandler = getHandler(actionMap, type);
    const validateHandler = getHandler(validateMap, type);

    if (validateHandler) {
      validateError = validateHandler(value, actionObj);
      if (validateError) {
        return state;
      }
    }

    // alow action to be no operation
    const nextValue = actionHandler(value, actionObj) || value;
    const nextStatus = transit(nextValue, stateHandler);
    currentStatus = nextStatus;

    const newState: State<States, Value> = {
      status: nextStatus,
      value: nextValue
    };
    return newState;
  };

  const getActions = () => {
    return Object.keys(stateMap.states[currentStatus]);
  };

  const getActionsWithState = (state: State<States, Value>) => {
    const { status } = state;
    return Object.keys(stateMap.states[status]);
  };

  const getValidateError = () => {
    return validateError;
  };

  const validate = (
    state: State<States, Value>,
    actionObj: Action<Actions>
  ): Error => {
    const { type } = actionObj;
    const { value } = state;
    const handler = getHandler(validateMap, type);
    if (handler) {
      return handler(value, actionObj);
    }
    return null;
  };

  return {
    reducer,
    getActionsWithState,
    getActions,
    getValidateError,
    validate
  };
}

export default makeFSM;
