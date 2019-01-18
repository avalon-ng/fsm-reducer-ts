interface FSMOption {
  validateMap?: object;
}
interface State<S> {
  status: S;
  value: object;
}
interface StateMap<A extends string> {
  start: {
      status: string;
      value: object;
  };
  states: {
      [status: string]: {
          [action in A]: any;
      };
  };
}
interface ActionMap<S> {
  [key: string]: (state: State<S>, ...args: any[]) => State<S>;
}
declare type MaybeError = Error | null;
declare type Reducer<S> = (state: State<S>, action: ActionObject) => State<S>;
declare type GetActions<A> = () => A[];
interface ActionObject {
  type: string;
  [key: string]: any;
}
declare function makeFSM<S extends Extract<keyof StateMap<A>['states'], string>, AM extends ActionMap<S>, A extends Extract<keyof AM, string>>(stateMap: StateMap<A>, actionMap: AM, opts?: FSMOption): {
  reducer: Reducer<S>;
  getActions: GetActions<A>;
  getValidateError: () => MaybeError;
};
export { makeFSM };
export default makeFSM;