interface IFSMOption {
  validateMap?: object;
}

interface IValue {

}

interface IState<T> {
  status: T;
  value: IValue;
}

interface IStateMap<A extends string> {
  start: {
    status: string;
    value: object;
  };
  states: {
    [status: string]: {
      [action in A]: string;
    }
  }
}

interface IActionMap<S> {
  [key: string]: (state: IState<S>, ...args: any[]) => IState<S>;
}

interface IActionObject {
  type: string;
  [key: string]: any;
}

interface IValidateMap {
  [key: string]: any;
}

type Reducer<S> = (state: IState<S>, action: IActionObject) => IState<S>
type GetActions = () => string[]
type ValidateError = string | null
type ValidateFunction = (state: IValue, action: IActionObject) => ValidateError
type ActionFunction = (state: IValue, action: IActionObject) => IValue
// type HandlerFunction = (handles: object, handleName: string) => ActionFunction | ValidateFunction


function makeFSM<
    S extends Extract<keyof IStateMap<A>['states'], string>,
    AM extends IActionMap<S>,
    A extends Extract<keyof AM, string>>
    (stateMap: IStateMap<A>, actionMap: AM, opts?: IFSMOption): {
        reducer: Reducer<S>;
        getActions: GetActions;
        getValidateError: () => ValidateError;
        validate: (state: IState<S>, actionObj: IActionObject) => ValidateError;
        getActionsWithState: (state: IState<S>) => string[];
    } {

  const validateMap: IValidateMap = (opts || {}).validateMap || {};
  const initState: IState<S> = stateMap.start as IState<S>;
  let currentStatus: S = stateMap.start.status as S;
  let validateError: ValidateError = null;

  function getHandler(handles: IActionMap<S>, handlerName: string): ActionFunction;
  function getHandler(handles: IValidateMap, handlerName: string): ValidateFunction;
  function getHandler(handles: any, handlerName: string): any {
    return handles[handlerName];
    //   // const actionParts = handlerName.split('.');
    //   // if(actionParts.length === 1) {
    //   //   return handles[handlerName];
    //   // }
    //   // return getHandler(handles[actionParts[0]], actionParts.slice(1).join('.'));
  }
  function transit(state: any, action: any): S ;
  function transit(state: IState<S>, action: Function): S;
  function transit(state: IState<S>, action: S): S;
  function transit(state: IState<S>, action: any): S {
    let nextStatus: S = currentStatus;
    if(typeof action === 'function') {
      nextStatus = action(state);
    } else {
      nextStatus = action;
    }
    if(!stateMap.states[nextStatus]) {
      const msg = `cannot transit to status ${nextStatus} from ${currentStatus}`;
      validateError = msg;
      nextStatus = currentStatus;
    }
    return nextStatus;
  }

  const validate = (state: any, actionObj: any): ValidateError => {
    const { value } = state;
    const { type: actionName } = actionObj;
    const fn: any = getHandler(validateMap, actionName);
    if (fn) {
      return fn(value, actionObj);
    }
    return 'Not found validation function.';
  }

  const reducer: Reducer<S> = (state = initState, actionObj) => {
    const { type: actionName } = actionObj;

    if( !actionName ) {
      return state;
    }

    const { status, value } = state;

    const availableActions: any = stateMap.states[status];

    if(!availableActions[actionName]) {
      const msg = `action ${actionName} is not available for status ${status}`;
      validateError = msg;
      return state;
    }


    const action: ActionFunction = getHandler(actionMap, actionName);
    const validateFunction: ValidateFunction = getHandler(validateMap, actionName);

    if ( validateFunction ) {
      validateError = validateFunction(value, actionObj);
      if ( validateError ){
        return state;
      }
    }

    // alow action to be no operation
    const nextValue = action(value, actionObj) || value;
    const nextStatus = transit(nextValue, availableActions[actionName]);
    currentStatus = nextStatus;

    return {
      status: nextStatus,
      value: nextValue
    };
  }

  const getActionsWithState = (state: IState<S>): string[] => {
    const { status } = state;
    return Object.keys(stateMap.states[status]);
  }

  const getActions = (): string[] => {
    return Object.keys(stateMap.states[currentStatus]);
  }

  const getValidateError = (): ValidateError => {
    return validateError;
  }

  return {
    getActions,
    getActionsWithState,
    getValidateError,
    reducer,
    validate,
  };
}

export default makeFSM;