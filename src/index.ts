// makeFSM(stateMap)
// interface Foo<T, K in keyof T> {
//   [k: K]: Function;
// }

interface IStateMap {
  start: {
    status: string;
    value: object;
  };
  states: {
    [key: string]: {
      [key: string]: string | (() => string)
    }
  };
}

interface IActionMap {
  [key: string]: string
}

interface IOptions {
  prefix?: string;
  validateMap?: any;
}

type MakeFSM = (stateMap: IStateMap, actionMap: IActionMap, opts?: IOptions) => object

interface IAction {
  type: string;
}

type ActionFunction = (state: any) => string
// type Handler = (state: any, action: any) => 

const makeFSM: MakeFSM = (stateMap, actionMap, opts = {}) => {
  const { prefix = '', validateMap = {} } = opts;
  const initState = {
    status: stateMap.start.status,
    value: stateMap.start.value
  };

  let currentStatus = stateMap.start.status;
  let validateError: Error | null = null;

  const getHandler = (handles: any, handlerName: string): (value: any, actionObj: any) => any => {
    const actionParts = handlerName.split('.');
    if (actionParts.length === 1) {
      return handles[handlerName];
    }
    return getHandler(handles[actionParts[0]], actionParts.slice(1).join('.'));
  }

  function transit(state: any, action: IAction | ActionFunction | string): string {
    let nextStatus = '';
    if (typeof action === 'function') {
      nextStatus = action(state);
    } else if (typeof action === 'string') {
      nextStatus = action;
    }
    if (!stateMap.states[nextStatus]) {
      const msg = `cannot transit to status ${nextStatus} from ${currentStatus}`;
      validateError = new Error(msg);
      nextStatus = currentStatus;
    }
    return nextStatus;
  }

  const reducer = (state = initState, actionObj: IAction) => {
    const { type } = actionObj;
    const actionName = (type || '').replace(new RegExp('^' + prefix), '');
    if (!actionName) {
      return state;
    }

    const { status, value } = state;

    const availableActions = stateMap.states[status];

    if (!availableActions[actionName]) {
      const msg = `action ${actionName} is not available for status ${status}`;
      validateError = new Error(msg);
      return state;
    }

    const action = getHandler(actionMap, actionName);
    const validate = getHandler(validateMap, actionName);

    if (validate) {
      validateError = validate(value, actionObj);
      if (validateError) {
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
  };

  const getActions = () => {
    return Object.keys(stateMap.states[currentStatus]);
  };

  const getValidateError = () => {
    return validateError;
  };

  return {
    getActions,
    getValidateError,
    reducer
  };
}

export default makeFSM;
