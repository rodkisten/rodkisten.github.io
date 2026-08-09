/**
 * Blocker v2.2.0
 * Ultra-performance TypeScript browser runtime for DOM, fetch and executable-resource rules.
 *
 * Design goals:
 * - zero dependencies
 * - userscript / browser-global friendly
 * - immutable O(1) selector chaining through structural sharing
 * - compiled DOM action targets and host matchers
 * - batched mutation scopes instead of unconditional full-document rescans
 * - no selector JSON/stringification in per-element hot paths
 * - fetch / script matching without temporary object spreads
 * - Shadow DOM + SPA navigation support
 * - strict, reusable public TypeScript API
 *
 * Build example:
 *   npx rolldown blocker.ts --format iife --name BlockerRuntime --file blocker.js
 *
 * Or with esbuild:
 *   npx esbuild blocker.ts --bundle --format=iife --target=es2020 --outfile=blocker.js
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Window {
  Blocker?: BlockerAPI;
  BlockerQueue?: BlockerQueueEntry[];
  GM_addStyle?: (css: string) => unknown;
}

type MaybePromise<T> = T | PromiseLike<T>;
type AnyRecord = Record<string, any>;
type SelectorRoot = Document | Element | ShadowRoot | DocumentFragment;
type FetchInput = RequestInfo | URL;
type ValueMatcher<T = unknown, C = unknown> =
  | T
  | readonly ValueMatcher<T, C>[]
  | RegExp
  | ((actual: T, context: C) => boolean);

type HostMatcher =
  | string
  | RegExp
  | readonly HostMatcher[]
  | ((context: PageContext) => boolean);

type TextMatcher = string | RegExp | ((text: string, element: Element) => boolean);

type SelectorResolver = (args: {
  root: SelectorRoot;
  context: PageContext;
  Blocker: BlockerAPI;
  current?: readonly Element[];
}) => unknown;

type SelectorTarget =
  | string
  | SelectQuery
  | SelectorResolver
  | readonly SelectorTarget[]
  | { xpath: string }
  | { selector: string }
  | ({ text: TextMatcher } & TextMatchOptions)
  | { resolve: SelectorResolver };

interface TextMatchOptions {
  exact?: boolean;
  caseSensitive?: boolean;
  selector?: string;
}

interface BlockerConfig {
  debug: boolean;
  logLevel: keyof typeof LOG_LEVELS;
  colouredLogs: boolean;
  collapsedLogGroups: boolean;
  observeMutations: boolean;
  observeAttributes: boolean;
  observeCharacterData: boolean;
  observeShadowRoots: boolean;
  processExistingShadowRoots: boolean;
  observerDebounceMs: number;
  navigationDebounceMs: number;
  mutationFullScanThreshold: number;
  maximumMutationScopes: number;
  maximumTextCandidates: number;
  interceptFetch: boolean;
  interceptScripts: boolean;
  interceptXHR: boolean;
  interceptWorkers: boolean;
  interceptDynamicCode: boolean;
  interceptDocumentWrite: boolean;
  interceptScriptPreloads: boolean;
  interceptWebAssembly: boolean;
  logAllScripts: boolean;
  logAllFetches: boolean;
  logFetchBodies: boolean;
  maximumLoggedBodyLength: number;
  dispatchEvents: boolean;
}

interface PageContext extends AnyRecord {
  window: Window;
  document: Document;
  location: Location;
  url: string;
  origin: string;
  protocol: string;
  hostname: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  title: string;
  Blocker: BlockerAPI;
}

interface BaseRule {
  id?: string;
  name?: string;
  enabled?: boolean;
  debug?: boolean;
  continue?: boolean;
}

interface DomAction {
  action: DomActionKind;
  targets: readonly SelectorTarget[];
  once?: boolean;
  when?: (element: Element, context: PageContext) => MaybePromise<boolean>;
  with?: Node | string | ((element: Element, context: PageContext) => MaybePromise<Node | string | null | undefined>);
  nativeClick?: boolean;
  attributes?: Record<string, unknown> | ((element: Element, context: PageContext) => MaybePromise<Record<string, unknown>>);
  properties?: Record<string, unknown> | ((element: Element, context: PageContext) => MaybePromise<Record<string, unknown>>);
  classNames?: readonly string[];
  handler?: (element: Element, context: PageContext) => MaybePromise<unknown>;
}

interface DomRule extends BaseRule {
  type?: typeof RULE_TYPES.DOM;
  host?: HostMatcher;
  pathname?: ValueMatcher<string, PageContext>;
  match?: (context: PageContext) => boolean;
  when?: (context: PageContext) => boolean;
  actions?: readonly DomAction[];
  before?: (context: PageContext) => MaybePromise<unknown>;
  run?: (context: PageContext, result: DomRunResult) => MaybePromise<unknown>;
  after?: (context: PageContext, result: DomRunResult) => MaybePromise<unknown>;
}

interface FetchMatchObject {
  hostname?: HostMatcher;
  host?: ValueMatcher<string, FetchContext>;
  pathname?: ValueMatcher<string, FetchContext>;
  search?: ValueMatcher<string, FetchContext>;
  method?: ValueMatcher<string, FetchContext>;
  test?: (context: FetchContext) => boolean;
}

type FetchMatch =
  | string
  | RegExp
  | ((context: FetchContext) => boolean)
  | readonly FetchMatch[]
  | FetchMatchObject;

interface BlockedResponseConfig {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  body?: BodyInit | Record<string, unknown> | null;
}

interface FetchContext extends AnyRecord {
  id: string;
  sequence: number;
  input: FetchInput;
  init?: RequestInit;
  request: Request | null;
  url: URL;
  href: string;
  hostname: string;
  host: string;
  pathname: string;
  search: string;
  method: string;
  headers: Headers;
  body?: BodyInit | null;
  startedAt: number;
  page: PageContext;
}

interface FetchRule extends BaseRule {
  type: typeof RULE_TYPES.FETCH;
  action?: FetchActionKind;
  match?: FetchMatch;
  response?: BlockedResponseConfig | ((context: FetchContext) => BlockedResponseConfig);
  redirect?: FetchInput | ((context: FetchContext) => MaybePromise<FetchInput>);
  modifyRequest?: (context: FetchContext & { input: FetchInput; init?: RequestInit }) => MaybePromise<
    | Request
    | ({ input?: FetchInput; init?: RequestInit } & RequestInit)
    | null
    | undefined
  >;
  modifyResponse?: (response: Response, context: FetchContext & { response: Response }) => MaybePromise<Response | unknown>;
  handler?: (context: FetchContext & {
    input: FetchInput;
    init?: RequestInit;
    fetch: typeof fetch | null;
  }) => MaybePromise<
    | Response
    | {
        input?: FetchInput;
        init?: RequestInit;
        response?: Response;
        blocked?: boolean;
      }
    | null
    | undefined
  >;
}

interface ScriptMatchObject {
  kind?: ValueMatcher<ScriptKind, ScriptContext>;
  src?: ValueMatcher<string, ScriptContext>;
  url?: ValueMatcher<string, ScriptContext>;
  hostname?: HostMatcher;
  pathname?: ValueMatcher<string, ScriptContext>;
  inline?: ValueMatcher<string, ScriptContext>;
  code?: ValueMatcher<string, ScriptContext>;
  type?: ValueMatcher<string, ScriptContext>;
  method?: ValueMatcher<string, ScriptContext>;
  test?: (context: ScriptContext) => boolean;
}

type ScriptMatch =
  | string
  | RegExp
  | ((context: ScriptContext) => boolean)
  | readonly ScriptMatch[]
  | ScriptMatchObject;

interface ScriptContext extends AnyRecord {
  kind: ScriptKind;
  url: string;
  src: string;
  hostname: string;
  host: string;
  pathname: string;
  origin: string;
  inline: string;
  code: string;
  type: string;
  method: string;
  element: Element | null;
  args: readonly unknown[];
  options?: unknown;
  page: PageContext;
}

interface ScriptRule extends BaseRule {
  type: typeof RULE_TYPES.SCRIPT;
  host?: HostMatcher;
  kind?: ValueMatcher<ScriptKind, ScriptContext>;
  match?: ScriptMatch;
  action?: ScriptActionKind;
  redirect?: string | ((context: ScriptContext) => string);
  modify?: unknown | ((context: ScriptContext) => unknown);
  handler?: (context: ScriptContext, decision: ScriptDecision) => unknown;
}

type Rule = DomRule | FetchRule | ScriptRule;
type NormalizedDomRule = DomRule & Required<Pick<BaseRule, 'id' | 'name' | 'enabled'>> & { type: typeof RULE_TYPES.DOM };
type NormalizedFetchRule = FetchRule & Required<Pick<BaseRule, 'id' | 'name' | 'enabled'>> & { type: typeof RULE_TYPES.FETCH; action: FetchActionKind };
type NormalizedScriptRule = ScriptRule & Required<Pick<BaseRule, 'id' | 'name' | 'enabled'>> & { type: typeof RULE_TYPES.SCRIPT; action: ScriptActionKind };
type NormalizedRule = NormalizedDomRule | NormalizedFetchRule | NormalizedScriptRule;

interface DomRunResult {
  ruleId: string;
  matched: number;
  affected: number;
  errors: number;
  duration?: string;
}

interface ScriptDecision {
  action: ScriptActionKind;
  context: ScriptContext;
  matchedRules: NormalizedScriptRule[];
  redirect: string | null;
  replacement: unknown;
  customResult: any;
}

interface SelectStep {
  type: SelectStepKind;
  [key: string]: any;
}

interface SelectNode {
  readonly previous: SelectNode | null;
  readonly step: Readonly<SelectStep>;
  readonly length: number;
}

interface CompiledDomTarget {
  target: SelectorTarget;
  identity: string;
}

interface CompiledDomAction {
  action: DomAction;
  targets: readonly CompiledDomTarget[];
}

interface RunDomRulesOptions {
  root?: SelectorRoot;
  reason?: string;
}

type BlockerQueueEntry = Rule | readonly Rule[] | ((Blocker: BlockerAPI) => unknown);

interface DebugAPI {
  trace(scope: string, message: string, ...values: unknown[]): void;
  debug(scope: string, message: string, ...values: unknown[]): void;
  info(scope: string, message: string, ...values: unknown[]): void;
  success(scope: string, message: string, ...values: unknown[]): void;
  warn(scope: string, message: string, ...values: unknown[]): void;
  error(scope: string, message: string, ...values: unknown[]): void;
  group<T>(level: keyof typeof LOG_LEVELS, scope: string, title: string, callback?: () => T): T | undefined;
  readonly config: BlockerConfig;
}


type EasyListTarget = 'easylist' | 'ublock';
type EasyListConversionQuality = 'exact' | 'equivalent' | 'lossy' | 'unsupported';
type EasyListUnsupportedMode = 'comment' | 'drop' | 'throw';
type EasyListRemovalMode = 'preserve' | 'hide';

interface EasyListWarning {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  ruleId?: string;
  line?: number;
  source?: string;
}

interface EasyListConversion {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  quality: EasyListConversionQuality;
  filters: string[];
  warnings: EasyListWarning[];
}

interface EasyListExportStats {
  rules: number;
  filters: number;
  exact: number;
  equivalent: number;
  lossy: number;
  unsupported: number;
}

interface EasyListExportOptions {
  target?: EasyListTarget;
  comments?: boolean;
  unsupported?: EasyListUnsupportedMode;
  removal?: EasyListRemovalMode;
  includeDisabled?: boolean;
  rules?: readonly Rule[];
  title?: string;
}

interface EasyListExportResult {
  target: EasyListTarget;
  text: string;
  conversions: EasyListConversion[];
  warnings: EasyListWarning[];
  stats: EasyListExportStats;
}

interface EasyListImportOptions {
  target?: EasyListTarget | 'auto';
  cosmeticAction?: 'hide' | 'remove' | 'preserve';
  idPrefix?: string;
  register?: boolean;
  replace?: boolean;
  run?: boolean;
}

interface EasyListImportStats {
  lines: number;
  parsed: number;
  rules: number;
  cosmetic: number;
  network: number;
  ignored: number;
  unsupported: number;
}

interface EasyListImportResult {
  rules: Rule[];
  registeredRules: NormalizedRule[];
  warnings: EasyListWarning[];
  unsupportedLines: Array<{ line: number; text: string; reason: string }>;
  stats: EasyListImportStats;
}

interface EasyListSelectorCompileResult {
  selectors: string[];
  quality: EasyListConversionQuality;
  warnings: EasyListWarning[];
}

interface EasyListRuleCompileOptions {
  target?: EasyListTarget;
  unsupported?: EasyListUnsupportedMode;
  removal?: EasyListRemovalMode;
}

interface EasyListValidationResult {
  valid: boolean;
  warnings: EasyListWarning[];
  unsupportedLines: Array<{ line: number; text: string; reason: string }>;
  stats: EasyListImportStats;
}

interface EasyListAPI {
  export(options?: EasyListExportOptions): EasyListExportResult;
  parse(text: string, options?: EasyListImportOptions): EasyListImportResult;
  import(text: string, options?: EasyListImportOptions): EasyListImportResult;
  compileRule(rule: Rule, options?: EasyListRuleCompileOptions): EasyListConversion;
  compileSelector(target: SelectorTarget, options?: EasyListRuleCompileOptions): EasyListSelectorCompileResult;
  validate(text: string, options?: EasyListImportOptions): EasyListValidationResult;
}

interface BlockerAPI {
  readonly __isBlockerRuntime: true;
  readonly name: string;
  readonly version: string;
  readonly ACTIONS: typeof ACTIONS;
  readonly FETCH_ACTIONS: typeof FETCH_ACTIONS;
  readonly SCRIPT_ACTIONS: typeof SCRIPT_ACTIONS;
  readonly SCRIPT_KINDS: typeof SCRIPT_KINDS;
  readonly RULE_TYPES: typeof RULE_TYPES;
  readonly SELECT_STEPS: typeof SELECT_STEPS;
  readonly SelectQuery: typeof SelectQuery;
  select(initialSelector?: string): SelectQuery;
  query(initialSelector?: string): SelectQuery;
  selectAny(...queries: SelectorTarget[]): SelectQuery;
  selectFirst(...queries: SelectorTarget[]): SelectQuery;
  resolve(target: SelectorTarget, root?: SelectorRoot, context?: PageContext): Element[];
  hide(...targets: SelectorTarget[]): DomAction;
  remove(...targets: SelectorTarget[]): DomAction;
  replace(target: SelectorTarget, replacement: DomAction['with'], options?: Partial<DomAction>): DomAction;
  click(...targets: SelectorTarget[]): DomAction;
  setAttributes(target: SelectorTarget, attributes: DomAction['attributes'], options?: Partial<DomAction>): DomAction;
  removeAttributes(target: SelectorTarget, ...attributes: (string | readonly string[])[]): DomAction;
  setProperties(target: SelectorTarget, properties: DomAction['properties'], options?: Partial<DomAction>): DomAction;
  addClass(target: SelectorTarget, ...classNames: (string | readonly string[])[]): DomAction;
  removeClass(target: SelectorTarget, ...classNames: (string | readonly string[])[]): DomAction;
  unwrap(...targets: SelectorTarget[]): DomAction;
  customAction(target: SelectorTarget, handler: NonNullable<DomAction['handler']>, options?: Partial<DomAction>): DomAction;
  blockScript(match: ScriptMatch, options?: Partial<ScriptRule>): ScriptRule;
  allowScript(match: ScriptMatch, options?: Partial<ScriptRule>): ScriptRule;
  redirectScript(match: ScriptMatch, redirect: ScriptRule['redirect'], options?: Partial<ScriptRule>): ScriptRule;
  modifyScript(match: ScriptMatch, modify: ScriptRule['modify'], options?: Partial<ScriptRule>): ScriptRule;
  customScriptRule(match: ScriptMatch, handler: NonNullable<ScriptRule['handler']>, options?: Partial<ScriptRule>): ScriptRule;
  addScriptRule(rule: Omit<ScriptRule, 'type'>, options?: AddRuleOptions): NormalizedScriptRule;
  addScriptRules(rules: readonly Omit<ScriptRule, 'type'>[], options?: AddRuleOptions): NormalizedScriptRule[];
  addRule(rule: Rule, options?: AddRuleOptions): NormalizedRule;
  addRules(rules: readonly Rule[], options?: AddRuleOptions): NormalizedRule[];
  getRule(id: string): NormalizedRule | null;
  getRules(options?: GetRulesOptions): NormalizedRule[];
  removeRule(id: string): boolean;
  clearRules(options?: GetRulesOptions): number;
  enableRule(id: string): boolean;
  disableRule(id: string): boolean;
  run(options?: RunDomRulesOptions): Promise<DomRunResult[]>;
  runRules(options?: RunDomRulesOptions): Promise<DomRunResult[]>;
  configure(nextConfig?: Partial<BlockerConfig>): BlockerConfig;
  getPageContext(overrides?: AnyRecord): PageContext;
  installFetchInterceptor(): boolean;
  uninstallFetchInterceptor(): boolean;
  installScriptInterceptors(): boolean;
  uninstallScriptInterceptors(): boolean;
  readonly debug: DebugAPI;
  readonly easyList: EasyListAPI;
  readonly ready: boolean;
  readonly rules: NormalizedRule[];
  readonly domRules: NormalizedDomRule[];
  readonly fetchRules: NormalizedFetchRule[];
  readonly scriptRules: NormalizedScriptRule[];
  readonly originalFetch: typeof fetch | null;
}

interface AddRuleOptions {
  replace?: boolean;
  run?: boolean;
}

interface GetRulesOptions {
  type?: RuleType;
  enabled?: boolean;
}

type BlockerWindow = Window & typeof globalThis;

const ACTIONS = {
  HIDE: 'hide',
  REMOVE: 'remove',
  REPLACE: 'replace',
  CLICK: 'click',
  SET_ATTRIBUTE: 'set-attribute',
  REMOVE_ATTRIBUTE: 'remove-attribute',
  SET_PROPERTY: 'set-property',
  ADD_CLASS: 'add-class',
  REMOVE_CLASS: 'remove-class',
  UNWRAP: 'unwrap',
  CUSTOM: 'custom',
} as const;

type DomActionKind = (typeof ACTIONS)[keyof typeof ACTIONS];

const FETCH_ACTIONS = {
  ALLOW: 'allow',
  BLOCK: 'block',
  REDIRECT: 'redirect',
  MODIFY_REQUEST: 'modify-request',
  MODIFY_RESPONSE: 'modify-response',
  CUSTOM: 'custom',
} as const;

type FetchActionKind = (typeof FETCH_ACTIONS)[keyof typeof FETCH_ACTIONS];

const RULE_TYPES = {
  DOM: 'dom',
  FETCH: 'fetch',
  SCRIPT: 'script',
} as const;

type RuleType = (typeof RULE_TYPES)[keyof typeof RULE_TYPES];

const SCRIPT_ACTIONS = {
  ALLOW: 'allow',
  BLOCK: 'block',
  REDIRECT: 'redirect',
  MODIFY: 'modify',
  CUSTOM: 'custom',
} as const;

type ScriptActionKind = (typeof SCRIPT_ACTIONS)[keyof typeof SCRIPT_ACTIONS];

const SCRIPT_KINDS = {
  ELEMENT: 'script-element',
  INLINE: 'inline-script',
  XHR: 'xhr',
  WORKER: 'worker',
  SHARED_WORKER: 'shared-worker',
  SERVICE_WORKER: 'service-worker',
  EVAL: 'eval',
  FUNCTION: 'function',
  TIMER: 'timer',
  DOCUMENT_WRITE: 'document-write',
  PRELOAD: 'script-preload',
  MODULE_PRELOAD: 'module-preload',
  WEBASSEMBLY: 'webassembly',
} as const;

type ScriptKind = (typeof SCRIPT_KINDS)[keyof typeof SCRIPT_KINDS];

const SELECT_STEPS = {
  CSS: 'css',
  XPATH: 'xpath',
  TEXT: 'text',
  ROLE: 'role',
  TEST_ID: 'test-id',
  TAG: 'tag',
  CUSTOM_SOURCE: 'custom-source',
  WITHIN: 'within',
  FILTER_TEXT: 'filter-text',
  FILTER_ATTRIBUTE: 'filter-attribute',
  FILTER_ATTRIBUTE_EXISTS: 'filter-attribute-exists',
  FILTER_PROPERTY: 'filter-property',
  FILTER_VISIBLE: 'filter-visible',
  FILTER_HIDDEN: 'filter-hidden',
  FILTER_ENABLED: 'filter-enabled',
  FILTER_DISABLED: 'filter-disabled',
  FILTER_IN_VIEWPORT: 'filter-in-viewport',
  FILTER_HAS: 'filter-has',
  FILTER_NOT: 'filter-not',
  FILTER_CUSTOM: 'filter-custom',
  CLOSEST: 'closest',
  PARENT: 'parent',
  CHILDREN: 'children',
  DESCENDANTS: 'descendants',
  NEXT: 'next',
  PREVIOUS: 'previous',
  SHADOW: 'shadow',
  UNIQUE: 'unique',
  FIRST: 'first',
  LAST: 'last',
  AT: 'at',
  LIMIT: 'limit',
  FALLBACK: 'fallback',
} as const;

type SelectStepKind = (typeof SELECT_STEPS)[keyof typeof SELECT_STEPS];

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  success: 2,
  warn: 3,
  error: 4,
  silent: 99,
} as const;

const LOG_STYLES: Record<string, readonly [string, string]> = {
  trace: ['background:#475569;color:#fff;', 'color:#64748b;'],
  debug: ['background:#4f46e5;color:#fff;', 'color:#818cf8;'],
  info: ['background:#0369a1;color:#fff;', 'color:#38bdf8;'],
  success: ['background:#047857;color:#fff;', 'color:#10b981;'],
  warn: ['background:#b45309;color:#fff;', 'color:#f59e0b;'],
  error: ['background:#b91c1c;color:#fff;', 'color:#ef4444;'],
  dom: ['background:#0f766e;color:#fff;', 'color:#14b8a6;'],
  fetch: ['background:#6d28d9;color:#fff;', 'color:#a78bfa;'],
  script: ['background:#9f1239;color:#fff;', 'color:#fb7185;'],
  select: ['background:#4338ca;color:#fff;', 'color:#8b5cf6;'],
  plugin: ['background:#be185d;color:#fff;', 'color:#ec4899;'],
  loader: ['background:#334155;color:#fff;', 'color:#94a3b8;'],
};

const SELECT_STEP_CACHE = new WeakMap<SelectQuery, readonly Readonly<SelectStep>[]>();

let GET_PAGE_CONTEXT_HOOK: ((overrides?: AnyRecord) => PageContext) | null = null;
let RESOLVE_SELECT_QUERY_HOOK: ((query: SelectQuery, root?: SelectorRoot, context?: PageContext) => Element[]) | null = null;

function flatten<T>(values: readonly (T | readonly T[] | null | undefined)[]): T[] {
  const output: T[] = [];
  const stack: unknown[] = [...values].reverse();

  while (stack.length) {
    const value = stack.pop();
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
    } else {
      output.push(value as T);
    }
  }

  return output;
}

function getPageContext(overrides: AnyRecord = {}): PageContext {
  if (!GET_PAGE_CONTEXT_HOOK) throw new Error('Blocker runtime is not initialized.');
  return GET_PAGE_CONTEXT_HOOK(overrides);
}

function resolveSelectQuery(query: SelectQuery, root: SelectorRoot = document, context: PageContext = getPageContext()): Element[] {
  if (!RESOLVE_SELECT_QUERY_HOOK) throw new Error('Blocker selector runtime is not initialized.');
  return RESOLVE_SELECT_QUERY_HOOK(query, root, context);
}

class SelectQuery {
  private readonly tail: SelectNode | null;
  readonly length: number;

  constructor(tail: SelectNode | null = null, length = 0) {
    this.tail = tail;
    this.length = length;
    Object.freeze(this);
  }

  private append(type: SelectStepKind, payload: AnyRecord = {}): SelectQuery {
    const step = Object.freeze({ type, ...payload }) as Readonly<SelectStep>;
    const node: SelectNode = { previous: this.tail, step, length: this.length + 1 };
    return new SelectQuery(node, node.length);
  }

  get steps(): readonly Readonly<SelectStep>[] {
    const cached = SELECT_STEP_CACHE.get(this);
    if (cached) return cached;

    const output = new Array<Readonly<SelectStep>>(this.length);
    let node = this.tail;
    let index = this.length - 1;

    while (node) {
      output[index--] = node.step;
      node = node.previous;
    }

    const frozen = Object.freeze(output);
    SELECT_STEP_CACHE.set(this, frozen);
    return frozen;
  }

  css(selector: string): SelectQuery { return this.append(SELECT_STEPS.CSS, { selector }); }
  xpath(expression: string): SelectQuery { return this.append(SELECT_STEPS.XPATH, { expression }); }
  text(expected: TextMatcher, options: TextMatchOptions = {}): SelectQuery { return this.append(SELECT_STEPS.TEXT, { expected, options }); }
  role(roleName: string, options: TextMatchOptions & { name?: TextMatcher } = {}): SelectQuery { return this.append(SELECT_STEPS.ROLE, { roleName, options }); }
  testId(value: string, attribute = 'data-testid'): SelectQuery { return this.append(SELECT_STEPS.TEST_ID, { value, attribute }); }
  tag(tagName: string): SelectQuery { return this.append(SELECT_STEPS.TAG, { tagName }); }
  custom(resolver: SelectorResolver): SelectQuery { return this.append(SELECT_STEPS.CUSTOM_SOURCE, { resolver }); }
  within(target: SelectorTarget): SelectQuery { return this.append(SELECT_STEPS.WITHIN, { target }); }
  hasText(expected: TextMatcher, options: TextMatchOptions = {}): SelectQuery { return this.append(SELECT_STEPS.FILTER_TEXT, { expected, options }); }
  attribute(name: string, expected: ValueMatcher<string | null, { element: Element; context: PageContext }>): SelectQuery { return this.append(SELECT_STEPS.FILTER_ATTRIBUTE, { name, expected }); }
  attributeExists(name: string): SelectQuery { return this.append(SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS, { name }); }
  property(name: string, expected: ValueMatcher<any, { element: Element; context: PageContext }>): SelectQuery { return this.append(SELECT_STEPS.FILTER_PROPERTY, { name, expected }); }
  visible(): SelectQuery { return this.append(SELECT_STEPS.FILTER_VISIBLE); }
  hidden(): SelectQuery { return this.append(SELECT_STEPS.FILTER_HIDDEN); }
  enabled(): SelectQuery { return this.append(SELECT_STEPS.FILTER_ENABLED); }
  disabled(): SelectQuery { return this.append(SELECT_STEPS.FILTER_DISABLED); }
  inViewport(margin = 0): SelectQuery { return this.append(SELECT_STEPS.FILTER_IN_VIEWPORT, { margin }); }
  has(target: SelectorTarget): SelectQuery { return this.append(SELECT_STEPS.FILTER_HAS, { target }); }
  not(target: SelectorTarget): SelectQuery { return this.append(SELECT_STEPS.FILTER_NOT, { target }); }
  filter(predicate: (element: Element, index: number, context: PageContext) => boolean): SelectQuery { return this.append(SELECT_STEPS.FILTER_CUSTOM, { predicate }); }
  closest(selector: string): SelectQuery { return this.append(SELECT_STEPS.CLOSEST, { selector }); }
  parent(selector?: string): SelectQuery { return this.append(SELECT_STEPS.PARENT, { selector }); }
  children(selector = '*'): SelectQuery { return this.append(SELECT_STEPS.CHILDREN, { selector }); }
  descendants(selector = '*'): SelectQuery { return this.append(SELECT_STEPS.DESCENDANTS, { selector }); }
  next(selector?: string): SelectQuery { return this.append(SELECT_STEPS.NEXT, { selector }); }
  previous(selector?: string): SelectQuery { return this.append(SELECT_STEPS.PREVIOUS, { selector }); }
  shadow(): SelectQuery { return this.append(SELECT_STEPS.SHADOW); }
  unique(): SelectQuery { return this.append(SELECT_STEPS.UNIQUE); }
  first(): SelectQuery { return this.append(SELECT_STEPS.FIRST); }
  last(): SelectQuery { return this.append(SELECT_STEPS.LAST); }
  at(index: number): SelectQuery { return this.append(SELECT_STEPS.AT, { index }); }
  limit(count: number): SelectQuery { return this.append(SELECT_STEPS.LIMIT, { count }); }
  fallback(...queries: SelectorTarget[]): SelectQuery { return this.append(SELECT_STEPS.FALLBACK, { queries: flatten(queries) }); }

  resolve(root: SelectorRoot = document, context: PageContext = getPageContext()): Element[] {
    return resolveSelectQuery(this, root, context);
  }

  toJSON(): { type: 'blocker-select'; steps: readonly Readonly<SelectStep>[] } {
    return { type: 'blocker-select', steps: this.steps };
  }
}

(function BlockerRuntime(globalWindow: BlockerWindow) {
  'use strict';

  if (globalWindow.Blocker?.__isBlockerRuntime) return;

  const SCRIPT = Object.freeze({
    name: 'Blocker',
    version: '2.2.0',
    globalName: 'Blocker' as const,
    queueName: 'BlockerQueue' as const,
  });

  const CONFIG: BlockerConfig = {
    debug: true,
    logLevel: 'debug',
    colouredLogs: true,
    collapsedLogGroups: true,
    observeMutations: true,
    observeAttributes: false,
    observeCharacterData: false,
    observeShadowRoots: true,
    processExistingShadowRoots: true,
    observerDebounceMs: 50,
    navigationDebounceMs: 24,
    mutationFullScanThreshold: 80,
    maximumMutationScopes: 32,
    maximumTextCandidates: 10_000,
    interceptFetch: true,
    interceptScripts: true,
    interceptXHR: true,
    interceptWorkers: true,
    interceptDynamicCode: true,
    interceptDocumentWrite: true,
    interceptScriptPreloads: true,
    interceptWebAssembly: true,
    logAllScripts: false,
    logAllFetches: false,
    logFetchBodies: false,
    maximumLoggedBodyLength: 2_000,
    dispatchEvents: true,
  };

  const INTERNAL = {
    initialized: false,
    stylesInstalled: false,
    navigationInstalled: false,
    shadowHookInstalled: false,
    fetchInstalled: false,
    scriptInterceptorsInstalled: false,
    currentUrl: location.href,
    observerTimer: 0 as number,
    navigationTimer: 0 as number,
    ruleSequence: 0,
    fetchSequence: 0,
    runSequence: 0,
    rulesById: new Map<string, NormalizedRule>(),
    domRules: [] as NormalizedDomRule[],
    fetchRules: [] as NormalizedFetchRule[],
    scriptRules: [] as NormalizedScriptRule[],
    processedElements: new WeakMap<Element, Set<string>>(),
    observedRoots: new WeakSet<Node>(),
    observers: new Set<MutationObserver>(),
    pendingMutationScopes: new Set<Element | ShadowRoot>(),
    pendingMutationCount: 0,
    originalFetch: null as typeof fetch | null,
    originals: new Map<string, any>(),
    originalAttachShadow: null as typeof Element.prototype.attachShadow | null,
    originalHistoryMethods: new Map<'pushState' | 'replaceState', History['pushState'] | History['replaceState']>(),
  };

  const COMPILED_DOM_ACTIONS = new WeakMap<NormalizedDomRule, readonly CompiledDomAction[]>();
  const HOST_MATCHERS = new WeakMap<object, (hostname: string, context: PageContext) => boolean>();

  function timestamp(): string {
    return new Date().toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  function duration(startTime: number): string {
    return `${(performance.now() - startTime).toFixed(2)}ms`;
  }

  function shouldLog(level: keyof typeof LOG_LEVELS): boolean {
    return CONFIG.debug && LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.logLevel];
  }

  function writeLog(level: keyof typeof LOG_LEVELS, scope: string, message: string, ...values: unknown[]): void {
    if (!shouldLog(level)) return;

    const method = level === 'success' ? console.info : ((console as any)[level] || console.log);
    const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;

    if (CONFIG.colouredLogs) {
      method.call(
        console,
        `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${message}`,
        `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`,
        'color:#94a3b8;font-weight:500;',
        style[1],
        ...values,
      );
      return;
    }

    method.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${message}`, ...values);
  }

  function writeGroup<T>(
    level: keyof typeof LOG_LEVELS,
    scope: string,
    title: string,
    callback?: () => T,
  ): T | undefined {
    if (!shouldLog(level)) return callback?.();

    const style = LOG_STYLES[scope] || LOG_STYLES[level] || LOG_STYLES.info;
    const group = CONFIG.collapsedLogGroups ? console.groupCollapsed : console.group;

    if (CONFIG.colouredLogs) {
      group.call(
        console,
        `%c${SCRIPT.name}:${scope}%c ${timestamp()} %c${title}`,
        `${style[0]}border-radius:4px;padding:2px 6px;font-weight:700;`,
        'color:#94a3b8;font-weight:500;',
        style[1],
      );
    } else {
      group.call(console, `[${SCRIPT.name}:${scope}] ${timestamp()} ${title}`);
    }

    try {
      return callback?.();
    } finally {
      console.groupEnd();
    }
  }

  const debug: DebugAPI = Object.freeze({
    trace: (scope: string, message: string, ...values: unknown[]) => writeLog('trace', scope, message, ...values),
    debug: (scope: string, message: string, ...values: unknown[]) => writeLog('debug', scope, message, ...values),
    info: (scope: string, message: string, ...values: unknown[]) => writeLog('info', scope, message, ...values),
    success: (scope: string, message: string, ...values: unknown[]) => writeLog('success', scope, message, ...values),
    warn: (scope: string, message: string, ...values: unknown[]) => writeLog('warn', scope, message, ...values),
    error: (scope: string, message: string, ...values: unknown[]) => writeLog('error', scope, message, ...values),
    group: writeGroup,
    get config() { return { ...CONFIG }; },
  });

  function dispatchBlockerEvent(name: string, detail: AnyRecord = {}): void {
    if (!CONFIG.dispatchEvents) return;
    globalWindow.dispatchEvent(new CustomEvent(`blocker:${name}`, {
      detail: { timestamp: Date.now(), ...detail },
    }));
  }

  function uniqueElements(values: Iterable<unknown>): Element[] {
    const output: Element[] = [];
    const seen = new Set<Element>();

    for (const value of values) {
      if (!(value instanceof Element) || seen.has(value)) continue;
      seen.add(value);
      output.push(value);
    }

    return output;
  }

  function normalizeElements(value: unknown): Element[] {
    if (value == null) return [];
    if (value instanceof Element) return [value];
    if (value instanceof DocumentFragment) return uniqueElements(value.children);
    if (typeof value === 'string') return [];

    if (
      Array.isArray(value) ||
      value instanceof NodeList ||
      value instanceof HTMLCollection ||
      (typeof (value as any)?.[Symbol.iterator] === 'function')
    ) {
      return uniqueElements(value as Iterable<unknown>);
    }

    return [];
  }

  function normalizeWhitespace(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function isPromiseLike<T = unknown>(value: unknown): value is PromiseLike<T> {
    return Boolean(value && (typeof value === 'object' || typeof value === 'function') && typeof (value as any).then === 'function');
  }

  async function settle<T>(value: MaybePromise<T>): Promise<T> {
    return isPromiseLike<T>(value) ? await value : value;
  }

  function escapeCss(value: unknown): string {
    const text = String(value);
    return globalWindow.CSS?.escape ? globalWindow.CSS.escape(text) : text.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  function matchesValue<T, C>(actual: T, expected: ValueMatcher<T, C> | null | undefined, context: C): boolean {
    if (expected == null) return true;

    if (Array.isArray(expected)) {
      for (const entry of expected) {
        if (matchesValue(actual, entry as ValueMatcher<T, C>, context)) return true;
      }
      return false;
    }

    if (expected instanceof RegExp) {
      expected.lastIndex = 0;
      return expected.test(String(actual));
    }

    if (typeof expected === 'function') {
      return Boolean((expected as (actual: T, context: C) => boolean)(actual, context));
    }

    return String(actual) === String(expected);
  }

  function matchesText(actual: unknown, expected: TextMatcher, options: TextMatchOptions = {}, element: Element): boolean {
    const normalizedActual = normalizeWhitespace(actual);

    if (expected instanceof RegExp) {
      expected.lastIndex = 0;
      return expected.test(normalizedActual);
    }

    if (typeof expected === 'function') {
      return Boolean(expected(normalizedActual, element));
    }

    const normalizedExpected = normalizeWhitespace(expected);
    const comparableActual = options.caseSensitive ? normalizedActual : normalizedActual.toLocaleLowerCase();
    const comparableExpected = options.caseSensitive ? normalizedExpected : normalizedExpected.toLocaleLowerCase();
    return options.exact ? comparableActual === comparableExpected : comparableActual.includes(comparableExpected);
  }

  function isVisible(element: Element): boolean {
    if (!element.isConnected) return false;

    const style = globalWindow.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      Number(style.opacity) === 0
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isInViewport(element: Element, margin = 0): boolean {
    const rect = element.getBoundingClientRect();
    return rect.bottom >= -margin &&
      rect.right >= -margin &&
      rect.top <= globalWindow.innerHeight + margin &&
      rect.left <= globalWindow.innerWidth + margin;
  }

  function queryCss(root: SelectorRoot, selector: string, includeRoot = false): Element[] {
    if (!root || typeof (root as ParentNode).querySelectorAll !== 'function') return [];

    try {
      const matches = (root as ParentNode).querySelectorAll(selector);
      const extra = includeRoot && root instanceof Element && root.matches(selector) ? 1 : 0;
      const output = new Array<Element>(matches.length + extra);
      let offset = 0;

      if (extra) {
        output[0] = root as Element;
        offset = 1;
      }

      for (let index = 0; index < matches.length; index += 1) {
        output[index + offset] = matches[index];
      }

      return output;
    } catch (error) {
      debug.warn('select', `Invalid CSS selector: ${selector}`, error);
      return [];
    }
  }

  function queryXPath(root: SelectorRoot, expression: string): Element[] {
    const ownerDocument = root instanceof Document ? root : root.ownerDocument || document;

    try {
      const result = ownerDocument.evaluate(expression, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const output: Element[] = [];
      const seen = new Set<Element>();

      for (let index = 0; index < result.snapshotLength; index += 1) {
        const node = result.snapshotItem(index);
        const element = node instanceof Element ? node : node?.parentElement;
        if (!element || seen.has(element)) continue;
        seen.add(element);
        output.push(element);
      }

      return output;
    } catch (error) {
      debug.warn('select', `Invalid XPath expression: ${expression}`, error);
      return [];
    }
  }

  function select(initialSelector?: string): SelectQuery {
    const query = new SelectQuery();
    return initialSelector == null ? query : query.css(initialSelector);
  }

  const query = select;

  function selectAny(...queries: SelectorTarget[]): SelectQuery {
    const flattened = flatten<SelectorTarget>(queries);
    return select().custom(({ root, context }) => {
      const output: Element[] = [];
      const seen = new Set<Element>();

      for (const entry of flattened) {
        const matches = resolveSelector(entry, root, context);
        for (const element of matches) {
          if (seen.has(element)) continue;
          seen.add(element);
          output.push(element);
        }
      }

      return output;
    });
  }

  function selectFirst(...queries: SelectorTarget[]): SelectQuery {
    const flattened = flatten<SelectorTarget>(queries);
    return select().custom(({ root, context }) => {
      for (const entry of flattened) {
        const matches = resolveSelector(entry, root, context);
        if (matches.length) return matches;
      }
      return [];
    });
  }

  function runStep(current: Element[], step: Readonly<SelectStep>, root: SelectorRoot, context: PageContext): Element[] {
    switch (step.type) {
      case SELECT_STEPS.CSS: {
        if (current.length === 0) return queryCss(root, step.selector, true);
        const output: Element[] = [];
        const seen = new Set<Element>();
        for (const element of current) {
          for (const match of queryCss(element, step.selector, false)) {
            if (seen.has(match)) continue;
            seen.add(match);
            output.push(match);
          }
        }
        return output;
      }

      case SELECT_STEPS.XPATH: {
        if (current.length === 0) return queryXPath(root, step.expression);
        const output: Element[] = [];
        const seen = new Set<Element>();
        for (const element of current) {
          for (const match of queryXPath(element, step.expression)) {
            if (seen.has(match)) continue;
            seen.add(match);
            output.push(match);
          }
        }
        return output;
      }

      case SELECT_STEPS.TEXT: {
        const scope = current.length === 0
          ? queryCss(root, step.options?.selector || 'button,a,[role="button"],label,summary,p,span,div', true)
          : current;
        const maximum = Math.min(scope.length, CONFIG.maximumTextCandidates);
        const output: Element[] = [];
        for (let index = 0; index < maximum; index += 1) {
          const element = scope[index];
          if (matchesText(element.textContent, step.expected, step.options, element)) output.push(element);
        }
        return output;
      }

      case SELECT_STEPS.ROLE: {
        const roleName = String(step.roleName);
        const selector = `[role="${escapeCss(roleName)}"]`;
        const scope = current.length === 0
          ? queryCss(root, selector, true)
          : current.filter((element) => element.getAttribute('role') === roleName);
        if (step.options?.name == null) return scope;
        return scope.filter((element) => matchesText(
          element.getAttribute('aria-label') || element.textContent,
          step.options.name,
          step.options,
          element,
        ));
      }

      case SELECT_STEPS.TEST_ID: {
        const attribute = String(step.attribute);
        const value = String(step.value);
        const selector = `[${escapeCss(attribute)}="${escapeCss(value)}"]`;
        return current.length === 0
          ? queryCss(root, selector, true)
          : current.filter((element) => element.getAttribute(attribute) === value);
      }

      case SELECT_STEPS.TAG: {
        const tag = String(step.tagName).toLocaleLowerCase();
        return current.length === 0
          ? queryCss(root, tag, true)
          : current.filter((element) => element.localName === tag);
      }

      case SELECT_STEPS.CUSTOM_SOURCE:
        return normalizeElements(step.resolver({ root, context, current, Blocker: PUBLIC_API }));

      case SELECT_STEPS.WITHIN: {
        const scopes = resolveSelector(step.target, root, context);
        if (current.length === 0) {
          const output: Element[] = [];
          const seen = new Set<Element>();
          for (const scope of scopes) {
            for (const child of scope.children) {
              if (seen.has(child)) continue;
              seen.add(child);
              output.push(child);
            }
          }
          return output;
        }
        return current.filter((element) => scopes.some((scope) => scope.contains(element)));
      }

      case SELECT_STEPS.FILTER_TEXT:
        return current.filter((element) => matchesText(element.textContent, step.expected, step.options, element));

      case SELECT_STEPS.FILTER_ATTRIBUTE:
        return current.filter((element) => matchesValue(
          element.getAttribute(step.name),
          step.expected,
          { element, context },
        ));

      case SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS:
        return current.filter((element) => element.hasAttribute(step.name));

      case SELECT_STEPS.FILTER_PROPERTY:
        return current.filter((element) => matchesValue(
          (element as any)[step.name],
          step.expected,
          { element, context },
        ));

      case SELECT_STEPS.FILTER_VISIBLE:
        return current.filter(isVisible);

      case SELECT_STEPS.FILTER_HIDDEN:
        return current.filter((element) => !isVisible(element));

      case SELECT_STEPS.FILTER_ENABLED:
        return current.filter((element) => !element.matches(':disabled,[aria-disabled="true"]'));

      case SELECT_STEPS.FILTER_DISABLED:
        return current.filter((element) => element.matches(':disabled,[aria-disabled="true"]'));

      case SELECT_STEPS.FILTER_IN_VIEWPORT:
        return current.filter((element) => isInViewport(element, Number(step.margin) || 0));

      case SELECT_STEPS.FILTER_HAS:
        return current.filter((element) => resolveSelector(step.target, element, context).length > 0);

      case SELECT_STEPS.FILTER_NOT:
        return current.filter((element) =>
          resolveSelector(step.target, element, context).length === 0 &&
          !matchesElementSelector(element, step.target, context));

      case SELECT_STEPS.FILTER_CUSTOM:
        return current.filter((element, index) => Boolean(step.predicate(element, index, context)));

      case SELECT_STEPS.CLOSEST:
        return uniqueElements(current.map((element) => element.closest(step.selector)));

      case SELECT_STEPS.PARENT:
        return uniqueElements(current.map((element) => {
          const parent = element.parentElement;
          return parent && (!step.selector || parent.matches(step.selector)) ? parent : null;
        }));

      case SELECT_STEPS.CHILDREN: {
        const output: Element[] = [];
        const seen = new Set<Element>();
        for (const element of current) {
          for (const child of element.children) {
            if (!child.matches(step.selector) || seen.has(child)) continue;
            seen.add(child);
            output.push(child);
          }
        }
        return output;
      }

      case SELECT_STEPS.DESCENDANTS: {
        const output: Element[] = [];
        const seen = new Set<Element>();
        for (const element of current) {
          for (const child of queryCss(element, step.selector, false)) {
            if (seen.has(child)) continue;
            seen.add(child);
            output.push(child);
          }
        }
        return output;
      }

      case SELECT_STEPS.NEXT:
        return uniqueElements(current.map((element) => {
          const sibling = element.nextElementSibling;
          return sibling && (!step.selector || sibling.matches(step.selector)) ? sibling : null;
        }));

      case SELECT_STEPS.PREVIOUS:
        return uniqueElements(current.map((element) => {
          const sibling = element.previousElementSibling;
          return sibling && (!step.selector || sibling.matches(step.selector)) ? sibling : null;
        }));

      case SELECT_STEPS.SHADOW: {
        const output: Element[] = [];
        const seen = new Set<Element>();
        for (const element of current) {
          const shadowRoot = element.shadowRoot;
          if (!shadowRoot) continue;
          for (const child of shadowRoot.children) {
            if (seen.has(child)) continue;
            seen.add(child);
            output.push(child);
          }
        }
        return output;
      }

      case SELECT_STEPS.UNIQUE:
        return uniqueElements(current);

      case SELECT_STEPS.FIRST:
        return current.length ? [current[0]] : [];

      case SELECT_STEPS.LAST:
        return current.length ? [current[current.length - 1]] : [];

      case SELECT_STEPS.AT: {
        const index = step.index < 0 ? current.length + step.index : step.index;
        return index >= 0 && index < current.length ? [current[index]] : [];
      }

      case SELECT_STEPS.LIMIT:
        return current.slice(0, Math.max(0, Number(step.count) || 0));

      case SELECT_STEPS.FALLBACK:
        if (current.length) return current;
        for (const fallbackQuery of step.queries as SelectorTarget[]) {
          const matches = resolveSelector(fallbackQuery, root, context);
          if (matches.length) return matches;
        }
        return [];

      default:
        debug.warn('select', `Unknown select step: ${String(step.type)}`);
        return current;
    }
  }

  function resolveSelectQueryCore(selectQuery: SelectQuery, root: SelectorRoot = document, context: PageContext = getPageContext()): Element[] {
    const startedAt = shouldLog('trace') ? performance.now() : 0;
    let current: Element[] = [];

    for (const step of selectQuery.steps) current = runStep(current, step, root, context);

    const result = uniqueElements(current);
    if (startedAt) {
      debug.trace(
        'select',
        `Resolved ${result.length} element(s) through ${selectQuery.length} step(s) in ${duration(startedAt)}.`,
        selectQuery.toJSON(),
      );
    }
    return result;
  }

  function matchesElementSelector(element: Element, target: SelectorTarget, context: PageContext): boolean {
    if (typeof target === 'string') {
      try { return element.matches(target); } catch { return false; }
    }

    if (target instanceof SelectQuery) {
      return resolveSelectQueryCore(target, element.ownerDocument || document, context).includes(element);
    }

    return false;
  }

  function resolveSelector(target: SelectorTarget, root: SelectorRoot = document, context: PageContext = getPageContext()): Element[] {
    if (target instanceof SelectQuery) return resolveSelectQueryCore(target, root, context);
    if (typeof target === 'string') return queryCss(root, target, true);

    if (typeof target === 'function') {
      return normalizeElements(target({ root, context, Blocker: PUBLIC_API }));
    }

    if (Array.isArray(target)) {
      const output: Element[] = [];
      const seen = new Set<Element>();
      for (const entry of target) {
        for (const element of resolveSelector(entry, root, context)) {
          if (seen.has(element)) continue;
          seen.add(element);
          output.push(element);
        }
      }
      return output;
    }

    if ('xpath' in target) return queryXPath(root, target.xpath);
    if ('selector' in target) return queryCss(root, String(target.selector), true);
    if ('text' in target) return select().text(target.text, target).resolve(root, context);
    if ('resolve' in target) return normalizeElements(target.resolve({ root, context, Blocker: PUBLIC_API }));
    return [];
  }

  function createAction(action: DomActionKind, targets: readonly SelectorTarget[], options: Partial<DomAction> = {}): DomAction {
    return { action, targets: flatten<SelectorTarget>(targets), ...options };
  }

  function hide(...targets: SelectorTarget[]): DomAction { return createAction(ACTIONS.HIDE, targets); }
  function remove(...targets: SelectorTarget[]): DomAction { return createAction(ACTIONS.REMOVE, targets); }
  function replace(target: SelectorTarget, replacement: DomAction['with'], options: Partial<DomAction> = {}): DomAction {
    return createAction(ACTIONS.REPLACE, [target], { with: replacement, ...options });
  }
  function click(...targets: SelectorTarget[]): DomAction { return createAction(ACTIONS.CLICK, targets); }
  function setAttributes(target: SelectorTarget, attributes: DomAction['attributes'], options: Partial<DomAction> = {}): DomAction {
    return createAction(ACTIONS.SET_ATTRIBUTE, [target], { attributes, ...options });
  }
  function removeAttributes(target: SelectorTarget, ...attributes: (string | readonly string[])[]): DomAction {
    return createAction(ACTIONS.REMOVE_ATTRIBUTE, [target], { attributes: flatten<string>(attributes) as any });
  }
  function setProperties(target: SelectorTarget, properties: DomAction['properties'], options: Partial<DomAction> = {}): DomAction {
    return createAction(ACTIONS.SET_PROPERTY, [target], { properties, ...options });
  }
  function addClass(target: SelectorTarget, ...classNames: (string | readonly string[])[]): DomAction {
    return createAction(ACTIONS.ADD_CLASS, [target], { classNames: flatten<string>(classNames) });
  }
  function removeClass(target: SelectorTarget, ...classNames: (string | readonly string[])[]): DomAction {
    return createAction(ACTIONS.REMOVE_CLASS, [target], { classNames: flatten<string>(classNames) });
  }
  function unwrap(...targets: SelectorTarget[]): DomAction { return createAction(ACTIONS.UNWRAP, targets); }
  function customAction(target: SelectorTarget, handler: NonNullable<DomAction['handler']>, options: Partial<DomAction> = {}): DomAction {
    return createAction(ACTIONS.CUSTOM, [target], { handler, ...options });
  }

  function createPageContext(overrides: AnyRecord = {}): PageContext {
    return {
      window: globalWindow,
      document,
      location,
      url: location.href,
      origin: location.origin,
      protocol: location.protocol,
      hostname: location.hostname,
      host: location.host,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      title: document.title,
      Blocker: PUBLIC_API,
      ...overrides,
    };
  }

  GET_PAGE_CONTEXT_HOOK = createPageContext;
  RESOLVE_SELECT_QUERY_HOOK = resolveSelectQueryCore;

  function compileHostMatcher(matcher: HostMatcher | undefined): (hostname: string, context: PageContext) => boolean {
    if (matcher == null || matcher === '*') return () => true;

    if (typeof matcher === 'string') {
      const pattern = matcher.toLocaleLowerCase();
      if (pattern.startsWith('*.')) {
        const base = pattern.slice(2);
        return (hostname) => {
          const actual = hostname.toLocaleLowerCase();
          return actual === base || actual.endsWith(`.${base}`);
        };
      }
      return (hostname) => hostname.toLocaleLowerCase() === pattern;
    }

    if (matcher instanceof RegExp) {
      return (hostname) => {
        matcher.lastIndex = 0;
        return matcher.test(hostname);
      };
    }

    if (typeof matcher === 'function') return (_hostname, context) => Boolean(matcher(context));

    const compiled = matcher.map((entry) => compileHostMatcher(entry));
    return (hostname, context) => {
      for (const test of compiled) if (test(hostname, context)) return true;
      return false;
    };
  }

  function matchesHost(hostname: string, matcher: HostMatcher | undefined, context: PageContext, owner?: object): boolean {
    if (!owner) return compileHostMatcher(matcher)(hostname, context);
    let compiled = HOST_MATCHERS.get(owner);
    if (!compiled) {
      compiled = compileHostMatcher(matcher);
      HOST_MATCHERS.set(owner, compiled);
    }
    return compiled(hostname, context);
  }

  function blockScript(match: ScriptMatch, options: Partial<ScriptRule> = {}): ScriptRule {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.BLOCK, ...options };
  }

  function allowScript(match: ScriptMatch, options: Partial<ScriptRule> = {}): ScriptRule {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.ALLOW, ...options };
  }

  function redirectScript(match: ScriptMatch, redirect: ScriptRule['redirect'], options: Partial<ScriptRule> = {}): ScriptRule {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.REDIRECT, redirect, ...options };
  }

  function modifyScript(match: ScriptMatch, modify: ScriptRule['modify'], options: Partial<ScriptRule> = {}): ScriptRule {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.MODIFY, modify, ...options };
  }

  function customScriptRule(match: ScriptMatch, handler: NonNullable<ScriptRule['handler']>, options: Partial<ScriptRule> = {}): ScriptRule {
    return { type: RULE_TYPES.SCRIPT, match, action: SCRIPT_ACTIONS.CUSTOM, handler, ...options };
  }

  function matchScriptValue<T>(actual: T, expected: ValueMatcher<T, ScriptContext> | undefined, context: ScriptContext): boolean {
    return matchesValue(actual, expected, context);
  }

  function createScriptContext(kind: ScriptKind, values: AnyRecord = {}): ScriptContext {
    const rawUrl = values.url || values.src || '';
    let parsedUrl: URL | null = null;
    if (rawUrl) {
      try { parsedUrl = new URL(String(rawUrl), location.href); } catch { parsedUrl = null; }
    }

    return {
      kind,
      url: parsedUrl?.href || String(rawUrl || ''),
      src: parsedUrl?.href || String(rawUrl || ''),
      hostname: parsedUrl?.hostname || '',
      host: parsedUrl?.host || '',
      pathname: parsedUrl?.pathname || '',
      origin: parsedUrl?.origin || '',
      inline: String(values.inline ?? values.code ?? ''),
      code: String(values.code ?? values.inline ?? ''),
      type: String(values.type || ''),
      method: String(values.method || '').toUpperCase(),
      element: values.element instanceof Element ? values.element : null,
      args: Array.isArray(values.args) ? values.args : [],
      options: values.options,
      page: getPageContext(),
      ...values,
    } as ScriptContext;
  }

  function matchesScriptMatch(match: ScriptMatch | undefined, context: ScriptContext): boolean {
    if (match == null) return true;
    if (typeof match === 'string') return context.url.includes(match) || context.code.includes(match);
    if (match instanceof RegExp) {
      match.lastIndex = 0;
      return match.test(context.url || context.code);
    }
    if (typeof match === 'function') return Boolean(match(context));
    if (Array.isArray(match)) {
      for (const entry of match) if (matchesScriptMatch(entry, context)) return true;
      return false;
    }

    const objectMatch = match as ScriptMatchObject;
    if (objectMatch.kind != null && !matchScriptValue(context.kind, objectMatch.kind, context)) return false;
    if (objectMatch.src != null && !matchScriptValue(context.src, objectMatch.src, context)) return false;
    if (objectMatch.url != null && !matchScriptValue(context.url, objectMatch.url, context)) return false;
    if (objectMatch.hostname != null && !matchesHost(context.hostname, objectMatch.hostname, context.page)) return false;
    if (objectMatch.pathname != null && !matchScriptValue(context.pathname, objectMatch.pathname, context)) return false;
    if (objectMatch.inline != null && !matchScriptValue(context.inline, objectMatch.inline, context)) return false;
    if (objectMatch.code != null && !matchScriptValue(context.code, objectMatch.code, context)) return false;
    if (objectMatch.type != null && !matchScriptValue(context.type, objectMatch.type, context)) return false;
    if (objectMatch.method != null && !matchScriptValue(context.method, objectMatch.method, context)) return false;
    return typeof objectMatch.test !== 'function' || objectMatch.test(context);
  }

  function matchesScriptRule(rule: NormalizedScriptRule, context: ScriptContext): boolean {
    if (!rule.enabled) return false;
    if (rule.kind != null && !matchScriptValue(context.kind, rule.kind, context)) return false;
    if (rule.host != null && !matchesHost(location.hostname, rule.host, context.page, rule)) return false;
    return matchesScriptMatch(rule.match, context);
  }

  function evaluateScriptRules(context: ScriptContext): ScriptDecision {
    const result: ScriptDecision = {
      action: SCRIPT_ACTIONS.ALLOW,
      context,
      matchedRules: [],
      redirect: null,
      replacement: null,
      customResult: null,
    };

    for (const rule of INTERNAL.scriptRules) {
      let matched = false;
      try { matched = matchesScriptRule(rule, context); }
      catch (error) {
        debug.error('script', `Matcher failed for "${rule.name}".`, error);
      }
      if (!matched) continue;

      result.matchedRules.push(rule);
      const action = rule.action || SCRIPT_ACTIONS.BLOCK;

      if (action === SCRIPT_ACTIONS.CUSTOM && rule.handler) {
        try {
          const customResult = rule.handler(context, result);
          result.customResult = customResult;
          if (customResult && typeof customResult === 'object') {
            const custom = customResult as AnyRecord;
            if (custom.action) result.action = custom.action as ScriptActionKind;
            if (custom.redirect) result.redirect = String(custom.redirect);
            if ('replacement' in custom) result.replacement = custom.replacement;
          }
        } catch (error) {
          debug.error('script', `Custom handler failed for "${rule.name}".`, error);
        }
      } else if (action === SCRIPT_ACTIONS.REDIRECT) {
        result.action = action;
        result.redirect = typeof rule.redirect === 'function' ? rule.redirect(context) : (rule.redirect || null);
      } else if (action === SCRIPT_ACTIONS.MODIFY) {
        result.action = action;
        result.replacement = typeof rule.modify === 'function' ? rule.modify(context) : rule.modify;
      } else {
        result.action = action;
      }

      if (rule.continue !== true || result.action === SCRIPT_ACTIONS.ALLOW) break;
    }

    if (CONFIG.logAllScripts || result.matchedRules.length) {
      const level = result.action === SCRIPT_ACTIONS.BLOCK ? 'warn' : 'debug';
      debug.group(level, 'script', `${context.kind} ${result.action}: ${context.url || truncateCode(context.code)}`, () => {
        console.log('Context:', context);
        console.log('Matched rules:', result.matchedRules.map(({ id, name, action }) => ({ id, name, action })));
      });
    }

    dispatchBlockerEvent('script', {
      kind: context.kind,
      url: context.url,
      action: result.action,
      matchedRuleIds: result.matchedRules.map((rule) => rule.id),
    });

    return result;
  }

  function truncateCode(code: unknown, maximum = 120): string {
    const normalized = String(code || '').replace(/\s+/g, ' ').trim();
    return normalized.length > maximum ? `${normalized.slice(0, maximum)}…` : normalized;
  }

  function rememberOriginal<T>(key: string, value: T): T {
    if (!INTERNAL.originals.has(key)) INTERNAL.originals.set(key, value);
    return value;
  }

  function preventScriptElement(script: HTMLScriptElement, reason = 'blocked'): void {
    try {
      script.type = 'application/x-blocker-blocked';
      script.dataset.blockerStatus = reason;
      script.removeAttribute('src');
      script.textContent = '';
    } catch {}
  }

  function inspectScriptElement(script: HTMLScriptElement): ScriptDecision {
    const src = script.getAttribute('src') || script.src || '';
    return evaluateScriptRules(createScriptContext(src ? SCRIPT_KINDS.ELEMENT : SCRIPT_KINDS.INLINE, {
      src,
      url: src,
      inline: src ? '' : script.textContent || '',
      code: src ? '' : script.textContent || '',
      type: script.getAttribute('type') || '',
      element: script,
    }));
  }

  function applyScriptElementDecision(script: HTMLScriptElement, decision: ScriptDecision): boolean {
    if (decision.action === SCRIPT_ACTIONS.BLOCK) {
      preventScriptElement(script);
      return false;
    }

    if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) {
      script.src = new URL(decision.redirect, location.href).href;
    }

    if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) {
      if (script.src) script.removeAttribute('src');
      script.textContent = String(decision.replacement);
    }

    return true;
  }

  function inspectScriptPreload(link: HTMLLinkElement): boolean {
    if (!CONFIG.interceptScriptPreloads) return true;
    const rel = String(link.rel || '').toLowerCase();
    const kind = rel === 'modulepreload' ? SCRIPT_KINDS.MODULE_PRELOAD : SCRIPT_KINDS.PRELOAD;
    const decision = evaluateScriptRules(createScriptContext(kind, {
      src: link.href,
      url: link.href,
      element: link,
      type: rel,
    }));

    if (decision.action === SCRIPT_ACTIONS.BLOCK) {
      link.removeAttribute('href');
      link.dataset.blockerStatus = 'blocked';
      return false;
    }

    if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) {
      link.href = new URL(decision.redirect, location.href).href;
    }
    return true;
  }

  function inspectNodeForScripts(node: Node): boolean {
    if (!CONFIG.interceptScripts) return true;

    let allowed = true;
    if (node instanceof HTMLScriptElement) {
      allowed = applyScriptElementDecision(node, inspectScriptElement(node)) && allowed;
    } else if (node instanceof HTMLLinkElement) {
      const rel = node.rel.toLowerCase();
      if (rel === 'modulepreload' || (rel === 'preload' && node.as === 'script')) {
        allowed = inspectScriptPreload(node) && allowed;
      }
    }

    if (!(node instanceof Element || node instanceof DocumentFragment)) return allowed;

    const scripts = node.querySelectorAll?.('script') || [];
    for (let index = 0; index < scripts.length; index += 1) {
      allowed = applyScriptElementDecision(scripts[index], inspectScriptElement(scripts[index])) && allowed;
    }

    if (CONFIG.interceptScriptPreloads) {
      const links = node.querySelectorAll?.('link[rel="preload"][as="script"],link[rel="modulepreload"]') || [];
      for (let index = 0; index < links.length; index += 1) {
        allowed = inspectScriptPreload(links[index] as HTMLLinkElement) && allowed;
      }
    }

    return allowed;
  }

  function patchMethod<T extends object, K extends keyof T>(owner: T, key: K, originalKey: string, wrapper: (original: any) => any): void {
    const original = owner[key];
    if (typeof original !== 'function') return;
    rememberOriginal(originalKey, original);
    try { owner[key] = wrapper(original) as T[K]; } catch {}
  }

  function installDomScriptInterceptors(): void {
    for (const methodName of ['appendChild', 'insertBefore', 'replaceChild'] as const) {
      patchMethod(Node.prototype, methodName, `Node.${methodName}`, (original) => function blockerNodeInsertion(this: Node, node: Node, ...rest: any[]) {
        inspectNodeForScripts(node);
        return Reflect.apply(original, this, [node, ...rest]);
      });
    }

    for (const prototype of [Element.prototype, Document.prototype, DocumentFragment.prototype] as const) {
      for (const methodName of ['append', 'prepend'] as const) {
        patchMethod(prototype as any, methodName as any, `${prototype.constructor?.name || 'ParentNode'}.${methodName}`, (original) => function blockerParentInsertion(this: ParentNode, ...nodes: (Node | string)[]) {
          if (CONFIG.interceptScripts) for (const node of nodes) if (node instanceof Node) inspectNodeForScripts(node);
          return Reflect.apply(original, this, nodes);
        });
      }
    }

    for (const prototype of [Element.prototype, CharacterData.prototype, DocumentType.prototype] as const) {
      for (const methodName of ['before', 'after', 'replaceWith'] as const) {
        patchMethod(prototype as any, methodName as any, `${prototype.constructor?.name || 'ChildNode'}.${methodName}`, (original) => function blockerChildInsertion(this: ChildNode, ...nodes: (Node | string)[]) {
          if (CONFIG.interceptScripts) for (const node of nodes) if (node instanceof Node) inspectNodeForScripts(node);
          return Reflect.apply(original, this, nodes);
        });
      }
    }

    const originalSetAttribute = rememberOriginal('Element.setAttribute', Element.prototype.setAttribute);
    Element.prototype.setAttribute = function blockerSetAttribute(name: string, value: string): void {
      if (CONFIG.interceptScripts && this instanceof HTMLScriptElement && name.toLowerCase() === 'src') {
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, {
          src: value,
          url: value,
          element: this,
          type: this.type,
        }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) {
          preventScriptElement(this);
          return;
        }
        if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) value = decision.redirect;
      }
      return Reflect.apply(originalSetAttribute, this, [name, value]);
    };

    const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
    if (srcDescriptor?.set && srcDescriptor.get) {
      rememberOriginal('HTMLScriptElement.src', srcDescriptor);
      Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        configurable: srcDescriptor.configurable,
        enumerable: srcDescriptor.enumerable,
        get: srcDescriptor.get,
        set(this: HTMLScriptElement, value: string) {
          if (!CONFIG.interceptScripts) return Reflect.apply(srcDescriptor.set!, this, [value]);
          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.ELEMENT, {
            src: value,
            url: value,
            element: this,
            type: this.type,
          }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) {
            preventScriptElement(this);
            return;
          }
          const nextValue = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : value;
          return Reflect.apply(srcDescriptor.set!, this, [nextValue]);
        },
      });
    }

    document.addEventListener('beforescriptexecute', (event: Event) => {
      if (!CONFIG.interceptScripts) return;
      const script = event.target;
      if (!(script instanceof HTMLScriptElement)) return;
      if (!applyScriptElementDecision(script, inspectScriptElement(script))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener('beforeload', (event: Event) => {
      if (!CONFIG.interceptScripts) return;
      const target = event.target;
      if (target instanceof HTMLScriptElement && !applyScriptElementDecision(target, inspectScriptElement(target))) event.preventDefault();
      if (target instanceof HTMLLinkElement && !inspectScriptPreload(target)) event.preventDefault();
    }, true);
  }

  interface BlockerXHRMeta {
    method: string;
    url: string | URL;
    async?: boolean;
    user?: string | null;
    password?: string | null;
  }

  const XHR_META = new WeakMap<XMLHttpRequest, BlockerXHRMeta>();

  function installXHRInterceptor(): void {
    if (typeof XMLHttpRequest !== 'function') return;
    const open = rememberOriginal('XMLHttpRequest.open', XMLHttpRequest.prototype.open);
    const send = rememberOriginal('XMLHttpRequest.send', XMLHttpRequest.prototype.send);

    XMLHttpRequest.prototype.open = function blockerXhrOpen(
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async = true,
      user: string | null = null,
      password: string | null = null,
    ): void {
      XHR_META.set(this, { method, url, async: Boolean(async), user, password });
      return Reflect.apply(open as any, this, [method, url, async, user, password]);
    } as XMLHttpRequest['open'];

    XMLHttpRequest.prototype.send = function blockerXhrSend(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
      if (!CONFIG.interceptScripts || !CONFIG.interceptXHR) return Reflect.apply(send, this, [body]);
      const meta = XHR_META.get(this);
      if (!meta) return Reflect.apply(send, this, [body]);

      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.XHR, {
        method: meta.method,
        url: meta.url,
        src: meta.url,
        body,
        xhr: this,
      }));

      if (decision.action === SCRIPT_ACTIONS.BLOCK) {
        queueMicrotask(() => {
          try { this.abort(); } catch {}
          try { this.dispatchEvent(new Event('error')); } catch {}
          try { this.dispatchEvent(new Event('loadend')); } catch {}
        });
        return;
      }

      if (decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect) {
        Reflect.apply(open as any, this, [meta.method, decision.redirect, meta.async, meta.user, meta.password]);
      }

      return Reflect.apply(send, this, [body]);
    };
  }

  function installWorkerInterceptors(): void {
    if (!CONFIG.interceptWorkers) return;

    const installWorker = (name: 'Worker' | 'SharedWorker', kind: ScriptKind): void => {
      const Original = globalWindow[name] as any;
      if (typeof Original !== 'function') return;
      rememberOriginal(name, Original);

      const Wrapped = function BlockerWorker(this: any, url: string | URL, options?: unknown) {
        if (!CONFIG.interceptScripts || !CONFIG.interceptWorkers) {
          return Reflect.construct(Original, options === undefined ? [url] : [url, options], new.target || Original);
        }

        const decision = evaluateScriptRules(createScriptContext(kind, { url, src: url, options }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) {
          throw new DOMException(`Blocked by ${SCRIPT.name}`, 'SecurityError');
        }
        const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
        return Reflect.construct(Original, options === undefined ? [nextUrl] : [nextUrl, options], new.target || Original);
      };

      Object.setPrototypeOf(Wrapped, Original);
      Wrapped.prototype = Original.prototype;
      try { (globalWindow as any)[name] = Wrapped; } catch {}
    };

    installWorker('Worker', SCRIPT_KINDS.WORKER);
    installWorker('SharedWorker', SCRIPT_KINDS.SHARED_WORKER);

    const serviceWorkerContainer = navigator.serviceWorker;
    const register = serviceWorkerContainer?.register;
    if (serviceWorkerContainer && typeof register === 'function') {
      rememberOriginal('ServiceWorker.register', register);
      try {
        (serviceWorkerContainer as any).register = function blockerServiceWorkerRegister(
          this: ServiceWorkerContainer,
          url: string | URL,
          options?: RegistrationOptions,
        ): Promise<ServiceWorkerRegistration> {
          if (!CONFIG.interceptScripts || !CONFIG.interceptWorkers) {
            return Reflect.apply(register, this, options === undefined ? [url] : [url, options]);
          }

          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.SERVICE_WORKER, { url, src: url, options }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) {
            return Promise.reject(new DOMException(`Blocked by ${SCRIPT.name}`, 'SecurityError'));
          }
          const nextUrl = decision.action === SCRIPT_ACTIONS.REDIRECT && decision.redirect ? decision.redirect : url;
          return Reflect.apply(register, this, options === undefined ? [nextUrl] : [nextUrl, options]);
        };
      } catch {}
    }
  }

  function installDynamicCodeInterceptors(): void {
    const originalEval = rememberOriginal('eval', globalWindow.eval);
    globalWindow.eval = function blockerEval(this: any, code: string): any {
      if (!CONFIG.interceptScripts || !CONFIG.interceptDynamicCode) return Reflect.apply(originalEval, this, [code]);
      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.EVAL, { code, inline: code }));
      if (decision.action === SCRIPT_ACTIONS.BLOCK) return undefined;
      const nextCode = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null ? String(decision.replacement) : code;
      return Reflect.apply(originalEval, this, [nextCode]);
    } as typeof eval;

    const OriginalFunction = rememberOriginal('Function', globalWindow.Function);
    const BlockerFunction = function (this: unknown, ...args: string[]): Function {
      if (!CONFIG.interceptScripts || !CONFIG.interceptDynamicCode) {
        return Reflect.construct(OriginalFunction, args, new.target || OriginalFunction);
      }
      const code = args.length ? args[args.length - 1] : '';
      const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.FUNCTION, { code, inline: code, args }));
      if (decision.action === SCRIPT_ACTIONS.BLOCK) return function blockedDynamicFunction() {};
      if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null && args.length) {
        args[args.length - 1] = String(decision.replacement);
      }
      return Reflect.construct(OriginalFunction, args, new.target || OriginalFunction);
    } as unknown as FunctionConstructor;

    Object.setPrototypeOf(BlockerFunction, OriginalFunction);
    (BlockerFunction as any).prototype = OriginalFunction.prototype;
    try { globalWindow.Function = BlockerFunction; } catch {}

    for (const timerName of ['setTimeout', 'setInterval'] as const) {
      const original = rememberOriginal(timerName, globalWindow[timerName] as any);
      (globalWindow as any)[timerName] = function blockerTimer(this: any, handler: TimerHandler, timeout?: number, ...args: any[]) {
        if (CONFIG.interceptScripts && CONFIG.interceptDynamicCode && typeof handler === 'string') {
          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.TIMER, {
            code: handler,
            inline: handler,
            timer: timerName,
            timeout,
          }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) return 0;
          if (decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null) handler = String(decision.replacement);
        }
        return Reflect.apply(original, this, [handler, timeout, ...args]);
      };
    }
  }

  function installDocumentWriteInterceptor(): void {
    for (const methodName of ['write', 'writeln'] as const) {
      const original = document[methodName];
      if (typeof original !== 'function') continue;
      rememberOriginal(`document.${methodName}`, original);
      document[methodName] = function blockerDocumentWrite(this: Document, ...parts: string[]): void {
        if (!CONFIG.interceptScripts || !CONFIG.interceptDocumentWrite) {
          return Reflect.apply(original, this, parts);
        }

        const html = parts.join(methodName === 'writeln' ? '\n' : '');
        const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.DOCUMENT_WRITE, {
          code: html,
          inline: html,
          html,
        }));
        if (decision.action === SCRIPT_ACTIONS.BLOCK) return;
        const nextHtml = decision.action === SCRIPT_ACTIONS.MODIFY && decision.replacement != null
          ? String(decision.replacement)
          : html;
        return Reflect.apply(original, this, [nextHtml]);
      } as Document[typeof methodName];
    }
  }

  function installWebAssemblyInterceptors(): void {
    const wasm = globalWindow.WebAssembly;
    if (!wasm) return;

    for (const methodName of ['instantiate', 'instantiateStreaming', 'compile', 'compileStreaming'] as const) {
      const original = (wasm as any)[methodName];
      if (typeof original !== 'function') continue;
      rememberOriginal(`WebAssembly.${methodName}`, original);
      try {
        (wasm as any)[methodName] = function blockerWebAssembly(...args: any[]) {
          if (!CONFIG.interceptScripts || !CONFIG.interceptWebAssembly) return Reflect.apply(original, this, args);
          const source = args[0];
          const sourceUrl = source instanceof Response ? source.url : '';
          const decision = evaluateScriptRules(createScriptContext(SCRIPT_KINDS.WEBASSEMBLY, {
            args,
            source,
            url: sourceUrl,
            src: sourceUrl,
          }));
          if (decision.action === SCRIPT_ACTIONS.BLOCK) {
            return Promise.reject(new WebAssembly.CompileError(`Blocked by ${SCRIPT.name}`));
          }
          return Reflect.apply(original, this, args);
        };
      } catch {}
    }
  }

  function restoreOriginal(key: string, target: any, property: PropertyKey): void {
    const original = INTERNAL.originals.get(key);
    if (original == null) return;
    try {
      if (original && typeof original === 'object' && ('get' in original || 'set' in original)) {
        Object.defineProperty(target, property, original);
      } else {
        target[property] = original;
      }
    } catch {}
  }

  function installScriptInterceptors(): boolean {
    if (INTERNAL.scriptInterceptorsInstalled || !CONFIG.interceptScripts) return false;
    INTERNAL.scriptInterceptorsInstalled = true;
    installDomScriptInterceptors();
    installXHRInterceptor();
    installWorkerInterceptors();
    installDynamicCodeInterceptors();
    installDocumentWriteInterceptor();
    installWebAssemblyInterceptors();
    debug.success('script', 'Script and executable-resource interceptors installed.');
    return true;
  }

  function uninstallScriptInterceptors(): boolean {
    if (!INTERNAL.scriptInterceptorsInstalled) return false;

    restoreOriginal('Element.setAttribute', Element.prototype, 'setAttribute');
    restoreOriginal('HTMLScriptElement.src', HTMLScriptElement.prototype, 'src');
    restoreOriginal('XMLHttpRequest.open', XMLHttpRequest.prototype, 'open');
    restoreOriginal('XMLHttpRequest.send', XMLHttpRequest.prototype, 'send');
    restoreOriginal('eval', globalWindow, 'eval');
    restoreOriginal('Function', globalWindow, 'Function');
    restoreOriginal('setTimeout', globalWindow, 'setTimeout');
    restoreOriginal('setInterval', globalWindow, 'setInterval');
    restoreOriginal('document.write', document, 'write');
    restoreOriginal('document.writeln', document, 'writeln');

    for (const methodName of ['appendChild', 'insertBefore', 'replaceChild'] as const) {
      restoreOriginal(`Node.${methodName}`, Node.prototype, methodName);
    }

    INTERNAL.scriptInterceptorsInstalled = false;
    debug.info('script', 'Core script interceptors restored where possible. Event listeners remain inert behind config guards.');
    return true;
  }

  function normalizeRule(rule: Rule): NormalizedRule {
    if (!rule || typeof rule !== 'object') throw new TypeError('Blocker rules must be objects.');
    INTERNAL.ruleSequence += 1;

    const type = rule.type || RULE_TYPES.DOM;
    const id = rule.id || `${type}-${Date.now().toString(36)}-${INTERNAL.ruleSequence.toString(36)}`;
    const name = rule.name || id;
    const enabled = rule.enabled !== false;

    if (type === RULE_TYPES.FETCH) {
      const fetchRule = rule as FetchRule;
      return { ...fetchRule, type, id, name, enabled, action: fetchRule.action || FETCH_ACTIONS.BLOCK } as NormalizedFetchRule;
    }
    if (type === RULE_TYPES.SCRIPT) {
      const scriptRule = rule as ScriptRule;
      return { ...scriptRule, type, id, name, enabled, action: scriptRule.action || SCRIPT_ACTIONS.BLOCK } as NormalizedScriptRule;
    }
    if (type === RULE_TYPES.DOM) {
      return { ...rule, type, id, name, enabled } as NormalizedDomRule;
    }
    throw new TypeError(`Unsupported rule type: ${String(type)}`);
  }

  function compileDomActions(rule: NormalizedDomRule): readonly CompiledDomAction[] {
    const cached = COMPILED_DOM_ACTIONS.get(rule);
    if (cached) return cached;

    const actions: CompiledDomAction[] = [];
    const sourceActions = Array.isArray(rule.actions) ? rule.actions : [];

    for (let actionIndex = 0; actionIndex < sourceActions.length; actionIndex += 1) {
      const action = sourceActions[actionIndex];
      const rawTargets = flatten<SelectorTarget>(action.targets || []);
      const targets = rawTargets.map((target, targetIndex) => ({
        target,
        identity: `${rule.id}:${action.action}:${actionIndex}:${targetIndex}`,
      }));
      actions.push({ action, targets });
    }

    COMPILED_DOM_ACTIONS.set(rule, actions);
    return actions;
  }

  function addRule(rule: Rule, options: AddRuleOptions = {}): NormalizedRule {
    const normalized = normalizeRule(rule);

    if (INTERNAL.rulesById.has(normalized.id)) {
      if (options.replace !== true) {
        debug.warn('plugin', `Rule "${normalized.id}" already exists.`);
        return INTERNAL.rulesById.get(normalized.id)!;
      }
      removeRule(normalized.id);
    }

    INTERNAL.rulesById.set(normalized.id, normalized);
    if (normalized.type === RULE_TYPES.FETCH) INTERNAL.fetchRules.push(normalized);
    else if (normalized.type === RULE_TYPES.SCRIPT) INTERNAL.scriptRules.push(normalized);
    else {
      INTERNAL.domRules.push(normalized);
      compileDomActions(normalized);
    }

    debug.success('plugin', `Added ${normalized.type} rule "${normalized.name}" (${normalized.id}).`);
    dispatchBlockerEvent('rule-added', { rule: normalized });

    if (normalized.type === RULE_TYPES.DOM && options.run !== false && INTERNAL.initialized) {
      queueMicrotask(() => void runDomRules({ reason: `rule-added:${normalized.id}` }));
    }

    return normalized;
  }

  function addRules(rules: readonly Rule[], options: AddRuleOptions = {}): NormalizedRule[] {
    if (!Array.isArray(rules)) throw new TypeError('Blocker.addRules() expects an array.');
    const added = new Array<NormalizedRule>(rules.length);
    for (let index = 0; index < rules.length; index += 1) {
      added[index] = addRule(rules[index], { ...options, run: false });
    }
    if (options.run !== false && INTERNAL.initialized) {
      queueMicrotask(() => void runDomRules({ reason: 'rules-added' }));
    }
    return added;
  }

  function addScriptRule(rule: Omit<ScriptRule, 'type'>, options: AddRuleOptions = {}): NormalizedScriptRule {
    return addRule({ ...rule, type: RULE_TYPES.SCRIPT }, options) as NormalizedScriptRule;
  }

  function addScriptRules(rules: readonly Omit<ScriptRule, 'type'>[], options: AddRuleOptions = {}): NormalizedScriptRule[] {
    const output = new Array<NormalizedScriptRule>(rules.length);
    for (let index = 0; index < rules.length; index += 1) {
      output[index] = addScriptRule(rules[index], { ...options, run: false });
    }
    return output;
  }

  function getRule(id: string): NormalizedRule | null {
    return INTERNAL.rulesById.get(id) || null;
  }

  function getRules(options: GetRulesOptions = {}): NormalizedRule[] {
    const output: NormalizedRule[] = [];
    for (const rule of INTERNAL.rulesById.values()) {
      if (options.type && rule.type !== options.type) continue;
      if (options.enabled != null && rule.enabled !== options.enabled) continue;
      output.push(rule);
    }
    return output;
  }

  function removeRule(id: string): boolean {
    const rule = getRule(id);
    if (!rule) return false;

    INTERNAL.rulesById.delete(id);
    const collection: NormalizedRule[] = rule.type === RULE_TYPES.FETCH
      ? INTERNAL.fetchRules
      : rule.type === RULE_TYPES.SCRIPT
        ? INTERNAL.scriptRules
        : INTERNAL.domRules;
    const index = collection.indexOf(rule as never);
    if (index >= 0) collection.splice(index, 1);

    debug.warn('plugin', `Removed rule "${rule.name}" (${rule.id}).`);
    dispatchBlockerEvent('rule-removed', { rule });
    return true;
  }

  function clearRules(options: GetRulesOptions = {}): number {
    const rules = getRules(options);
    for (const rule of rules) removeRule(rule.id);
    return rules.length;
  }

  function setRuleEnabled(id: string, enabled: boolean): boolean {
    const rule = getRule(id);
    if (!rule) return false;
    rule.enabled = Boolean(enabled);
    debug.info('plugin', `${rule.enabled ? 'Enabled' : 'Disabled'} rule "${rule.name}".`);
    dispatchBlockerEvent('rule-toggled', { rule, enabled: rule.enabled });
    if (rule.enabled && rule.type === RULE_TYPES.DOM) {
      queueMicrotask(() => void runDomRules({ reason: `rule-enabled:${rule.id}` }));
    }
    return true;
  }

  function markProcessed(element: Element, identity: string): void {
    let identities = INTERNAL.processedElements.get(element);
    if (!identities) {
      identities = new Set<string>();
      INTERNAL.processedElements.set(element, identities);
    }
    identities.add(identity);
  }

  function wasProcessed(element: Element, identity: string): boolean {
    return INTERNAL.processedElements.get(element)?.has(identity) ?? false;
  }

  async function executeDomAction(
    rule: NormalizedDomRule,
    action: DomAction,
    identity: string,
    element: Element,
    context: PageContext,
  ): Promise<boolean> {
    const once = action.once !== false;
    if (once && wasProcessed(element, identity)) return false;

    if (action.when) {
      const allowed = await settle(action.when(element, context));
      if (!allowed) return false;
    }

    if (once) markProcessed(element, identity);

    switch (action.action) {
      case ACTIONS.HIDE:
        element.classList.add('blocker-hidden');
        return true;

      case ACTIONS.REMOVE:
        element.remove();
        return true;

      case ACTIONS.REPLACE: {
        const replacement = typeof action.with === 'function'
          ? await settle(action.with(element, context))
          : action.with;

        if (replacement instanceof Node) {
          element.replaceWith(replacement);
          return true;
        }

        if (typeof replacement === 'string') {
          const template = document.createElement('template');
          template.innerHTML = replacement.trim();
          element.replaceWith(template.content);
          return true;
        }
        return false;
      }

      case ACTIONS.CLICK:
        if (action.nativeClick === false) {
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: globalWindow,
          }));
        } else {
          (element as HTMLElement).click?.();
        }
        return true;

      case ACTIONS.SET_ATTRIBUTE: {
        const attributes = typeof action.attributes === 'function'
          ? await settle(action.attributes(element, context))
          : action.attributes;

        for (const [name, value] of Object.entries(attributes || {})) {
          if (value == null || value === false) element.removeAttribute(name);
          else element.setAttribute(name, value === true ? '' : String(value));
        }
        return true;
      }

      case ACTIONS.REMOVE_ATTRIBUTE: {
        const attributes = (action as any).attributes as readonly string[] | undefined;
        if (!attributes) return false;
        for (const name of attributes) element.removeAttribute(String(name));
        return true;
      }

      case ACTIONS.SET_PROPERTY: {
        const properties = typeof action.properties === 'function'
          ? await settle(action.properties(element, context))
          : action.properties;
        if (!properties) return false;
        Object.assign(element, properties);
        return true;
      }

      case ACTIONS.ADD_CLASS:
        if (action.classNames?.length) element.classList.add(...action.classNames);
        return true;

      case ACTIONS.REMOVE_CLASS:
        if (action.classNames?.length) element.classList.remove(...action.classNames);
        return true;

      case ACTIONS.UNWRAP: {
        const parent = element.parentNode;
        if (!parent) return false;
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        element.remove();
        return true;
      }

      case ACTIONS.CUSTOM:
        if (!action.handler) return false;
        await settle(action.handler(element, context));
        return true;

      default:
        throw new TypeError(`Unknown DOM action: ${String(action.action)}`);
    }
  }

  async function runDomRules(options: RunDomRulesOptions = {}): Promise<DomRunResult[]> {
    INTERNAL.runSequence += 1;
    const root = options.root || document;
    const context = getPageContext({
      root,
      reason: options.reason || 'manual',
      runSequence: INTERNAL.runSequence,
    });
    const results: DomRunResult[] = [];

    for (const rule of INTERNAL.domRules) {
      if (!rule.enabled) continue;
      if (!matchesHost(context.hostname, rule.host, context, rule)) continue;
      if (rule.pathname != null && !matchesValue(context.pathname, rule.pathname, context)) continue;
      if (rule.match && !rule.match(context)) continue;
      if (rule.when && !rule.when(context)) continue;

      const startedAt = performance.now();
      const result: DomRunResult = { ruleId: rule.id, matched: 0, affected: 0, errors: 0 };

      try {
        if (rule.before) await settle(rule.before(context));

        const actions = compileDomActions(rule);
        for (const compiled of actions) {
          for (const compiledTarget of compiled.targets) {
            const elements = resolveSelector(compiledTarget.target, root, context);
            result.matched += elements.length;

            for (const element of elements) {
              try {
                if (await executeDomAction(rule, compiled.action, compiledTarget.identity, element, context)) {
                  result.affected += 1;
                }
              } catch (error) {
                result.errors += 1;
                debug.error('dom', `Action failed in rule "${rule.name}".`, error);
              }
            }
          }
        }

        if (rule.run) await settle(rule.run(context, result));
        if (rule.after) await settle(rule.after(context, result));
      } catch (error) {
        result.errors += 1;
        debug.error('dom', `Rule "${rule.name}" failed.`, error);
      }

      result.duration = duration(startedAt);
      results.push(result);

      if (result.affected > 0 || result.errors > 0 || rule.debug) {
        debug.group(result.errors ? 'error' : 'debug', 'dom', `${rule.name}: ${result.affected} affected in ${result.duration}`, () => console.table(result));
      }
    }

    return results;
  }

  function createFetchContext(input: FetchInput, init: RequestInit | undefined, sequence: number): FetchContext {
    const request = input instanceof Request ? input : null;
    const url = new URL(request?.url || String(input), location.href);

    return {
      id: `fetch-${sequence}`,
      sequence,
      input,
      init,
      request,
      url,
      href: url.href,
      hostname: url.hostname,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      method: String(init?.method || request?.method || 'GET').toUpperCase(),
      headers: new Headers(init?.headers || request?.headers || undefined),
      body: init?.body ?? null,
      startedAt: performance.now(),
      page: getPageContext(),
    };
  }

  function matchesFetchMatch(match: FetchMatch | undefined, context: FetchContext): boolean {
    if (match == null) return true;
    if (typeof match === 'string') return context.href.includes(match);
    if (match instanceof RegExp) {
      match.lastIndex = 0;
      return match.test(context.href);
    }
    if (typeof match === 'function') return Boolean(match(context));
    if (Array.isArray(match)) {
      for (const entry of match) if (matchesFetchMatch(entry, context)) return true;
      return false;
    }

    const objectMatch = match as FetchMatchObject;
    return matchesHost(context.hostname, objectMatch.hostname, context.page) &&
      matchesValue(context.host, objectMatch.host, context) &&
      matchesValue(context.pathname, objectMatch.pathname, context) &&
      matchesValue(context.search, objectMatch.search, context) &&
      matchesValue(context.method, objectMatch.method, context) &&
      (typeof objectMatch.test !== 'function' || objectMatch.test(context));
  }

  function matchesFetchRule(rule: NormalizedFetchRule, context: FetchContext): boolean {
    return rule.enabled && matchesFetchMatch(rule.match, context);
  }

  function blockedResponse(rule: NormalizedFetchRule, context: FetchContext): Response {
    const config = typeof rule.response === 'function' ? rule.response(context) : (rule.response || {});
    const headers = new Headers(config.headers || {});
    headers.set('x-blocked-by', SCRIPT.name);
    let body = config.body ?? null;

    if (
      body &&
      typeof body === 'object' &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer) &&
      !(body instanceof FormData) &&
      !(body instanceof URLSearchParams) &&
      !(body instanceof ReadableStream)
    ) {
      body = JSON.stringify(body);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
    }

    const requestedStatus = config.status;
    const status = requestedStatus ?? (body == null ? 204 : 200);
    const safeBody = status === 204 || status === 205 || status === 304 ? null : body as BodyInit | null;

    return new Response(safeBody, {
      status,
      statusText: config.statusText ?? 'Blocked by Blocker',
      headers,
    });
  }

  async function interceptedFetch(input: FetchInput, init?: RequestInit): Promise<Response> {
    INTERNAL.fetchSequence += 1;
    const sequence = INTERNAL.fetchSequence;
    let currentInput = input;
    let currentInit = init;
    let context = createFetchContext(currentInput, currentInit, sequence);
    let response: Response | null = null;
    let blocked = false;
    const matchedRules: NormalizedFetchRule[] = [];
    const responseModifiers: NormalizedFetchRule[] = [];

    for (const rule of INTERNAL.fetchRules) {
      if (!matchesFetchRule(rule, context)) continue;
      matchedRules.push(rule);

      if (rule.action === FETCH_ACTIONS.ALLOW) break;

      if (rule.action === FETCH_ACTIONS.BLOCK) {
        response = blockedResponse(rule, context);
        blocked = true;
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.REDIRECT) {
        if (!rule.redirect) continue;
        currentInput = typeof rule.redirect === 'function'
          ? await settle(rule.redirect(context))
          : rule.redirect;
        context = createFetchContext(currentInput, currentInit, sequence);
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.MODIFY_REQUEST) {
        if (!rule.modifyRequest) continue;
        const modification = await settle(rule.modifyRequest({
          ...context,
          input: currentInput,
          init: currentInit,
        }));

        if (modification instanceof Request) {
          currentInput = modification;
          currentInit = undefined;
        } else if (modification) {
          currentInput = modification.input ?? currentInput;
          currentInit = modification.init ?? { ...(currentInit || {}), ...modification };
        }

        context = createFetchContext(currentInput, currentInit, sequence);
        if (rule.continue !== true) break;
      } else if (rule.action === FETCH_ACTIONS.MODIFY_RESPONSE) {
        responseModifiers.push(rule);
      } else if (rule.action === FETCH_ACTIONS.CUSTOM) {
        if (!rule.handler) continue;
        const result = await settle(rule.handler({
          ...context,
          input: currentInput,
          init: currentInit,
          fetch: INTERNAL.originalFetch,
        }));

        if (result instanceof Response) {
          response = result;
        } else if (result) {
          currentInput = result.input ?? currentInput;
          currentInit = result.init ?? currentInit;
          response = result.response instanceof Response ? result.response : response;
          blocked = Boolean(result.blocked ?? blocked);
        }

        if (rule.continue !== true) break;
      }
    }

    if (!response) {
      if (!INTERNAL.originalFetch) throw new Error('Original fetch is unavailable.');
      response = await Reflect.apply(INTERNAL.originalFetch, globalWindow, [currentInput, currentInit]);
    }

    for (const rule of responseModifiers) {
      if (!rule.modifyResponse) continue;
      const modified: unknown = await settle(rule.modifyResponse(response, { ...context, response }));
      if (modified instanceof Response) response = modified;
    }

    if (CONFIG.logAllFetches || matchedRules.length) {
      debug.group(blocked ? 'warn' : 'debug', 'fetch', `#${sequence} ${context.method} ${context.href} → ${blocked ? 'BLOCKED' : response.status} · ${duration(context.startedAt)}`, () => {
        console.log('Matched rules:', matchedRules.map(({ id, name, action }) => ({ id, name, action })));
        console.log('Response:', response);
      });
    }

    dispatchBlockerEvent('fetch', {
      id: context.id,
      url: context.href,
      method: context.method,
      blocked,
      status: response.status,
      matchedRuleIds: matchedRules.map((rule) => rule.id),
    });

    return response;
  }

  function installFetchInterceptor(): boolean {
    if (INTERNAL.fetchInstalled || !CONFIG.interceptFetch || typeof globalWindow.fetch !== 'function') return false;
    INTERNAL.originalFetch = globalWindow.fetch.bind(globalWindow);
    globalWindow.fetch = interceptedFetch as typeof fetch;
    INTERNAL.fetchInstalled = true;
    debug.success('fetch', 'Fetch interceptor installed.');
    return true;
  }

  function uninstallFetchInterceptor(): boolean {
    if (!INTERNAL.fetchInstalled || !INTERNAL.originalFetch) return false;
    globalWindow.fetch = INTERNAL.originalFetch;
    INTERNAL.fetchInstalled = false;
    return true;
  }

  function addMutationScope(node: Node): void {
    if (node instanceof ShadowRoot) {
      INTERNAL.pendingMutationScopes.add(node);
      return;
    }

    if (node instanceof Element) {
      INTERNAL.pendingMutationScopes.add(node);
      return;
    }

    if (node.parentElement) INTERNAL.pendingMutationScopes.add(node.parentElement);
  }

  function collapseMutationScopes(scopes: readonly (Element | ShadowRoot)[]): (Element | ShadowRoot)[] {
    if (scopes.length <= 1) return [...scopes];
    const output: (Element | ShadowRoot)[] = [];

    outer: for (const candidate of scopes) {
      for (let index = output.length - 1; index >= 0; index -= 1) {
        const current = output[index];
        if (current === candidate) continue outer;
        if (current instanceof Element && candidate instanceof Element) {
          if (current.contains(candidate)) continue outer;
          if (candidate.contains(current)) output.splice(index, 1);
        } else if (current instanceof ShadowRoot && candidate.getRootNode() === current) {
          continue outer;
        }
      }
      output.push(candidate);
      if (output.length >= CONFIG.maximumMutationScopes) break;
    }

    return output;
  }

  function discoverShadowRootsFromNode(node: Node): void {
    if (!CONFIG.observeShadowRoots) return;

    if (node instanceof Element && node.shadowRoot) observeRoot(node.shadowRoot);
    if (!(node instanceof Element || node instanceof DocumentFragment)) return;

    const elements = node.querySelectorAll('*');
    for (let index = 0; index < elements.length; index += 1) {
      const shadowRoot = elements[index].shadowRoot;
      if (shadowRoot) observeRoot(shadowRoot);
    }
  }

  function flushMutationScopes(observerRoot: Element | ShadowRoot): void {
    INTERNAL.observerTimer = 0;
    const mutationCount = INTERNAL.pendingMutationCount;
    INTERNAL.pendingMutationCount = 0;
    const pending = Array.from(INTERNAL.pendingMutationScopes);
    INTERNAL.pendingMutationScopes.clear();

    if (!pending.length) return;

    if (mutationCount >= CONFIG.mutationFullScanThreshold || pending.length > CONFIG.maximumMutationScopes) {
      void runDomRules({ reason: 'mutation:full-scan', root: observerRoot });
      return;
    }

    const scopes = collapseMutationScopes(pending);
    for (const scope of scopes) void runDomRules({ reason: 'mutation', root: scope });
  }

  function scheduleMutationFlush(observerRoot: Element | ShadowRoot): void {
    if (INTERNAL.observerTimer) globalWindow.clearTimeout(INTERNAL.observerTimer);
    INTERNAL.observerTimer = globalWindow.setTimeout(
      () => flushMutationScopes(observerRoot),
      CONFIG.observerDebounceMs,
    );
  }

  function observeRoot(root: Element | ShadowRoot): void {
    if (!CONFIG.observeMutations || INTERNAL.observedRoots.has(root)) return;

    const observer = new MutationObserver((mutations) => {
      let relevant = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          if (!mutation.addedNodes.length) continue;
          relevant = true;
          INTERNAL.pendingMutationCount += mutation.addedNodes.length;
          addMutationScope(mutation.target);

          for (let index = 0; index < mutation.addedNodes.length; index += 1) {
            const node = mutation.addedNodes[index];
            addMutationScope(node);
            discoverShadowRootsFromNode(node);
          }
        } else if (mutation.type === 'attributes' && CONFIG.observeAttributes) {
          relevant = true;
          INTERNAL.pendingMutationCount += 1;
          addMutationScope(mutation.target);
        } else if (mutation.type === 'characterData' && CONFIG.observeCharacterData) {
          relevant = true;
          INTERNAL.pendingMutationCount += 1;
          addMutationScope(mutation.target);
        }
      }

      if (relevant) scheduleMutationFlush(root);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: CONFIG.observeAttributes,
      characterData: CONFIG.observeCharacterData,
    });

    INTERNAL.observedRoots.add(root);
    INTERNAL.observers.add(observer);
  }

  function discoverShadowRoots(root: SelectorRoot = document): void {
    if (!CONFIG.observeShadowRoots) return;

    if (root instanceof Element && root.shadowRoot) observeRoot(root.shadowRoot);
    const elements = queryCss(root, '*', root instanceof Element);
    for (const element of elements) if (element.shadowRoot) observeRoot(element.shadowRoot);
  }

  function installShadowHook(): void {
    if (INTERNAL.shadowHookInstalled || typeof Element.prototype.attachShadow !== 'function') return;
    INTERNAL.originalAttachShadow = Element.prototype.attachShadow;

    Element.prototype.attachShadow = function blockerAttachShadow(init: ShadowRootInit): ShadowRoot {
      const shadowRoot = Reflect.apply(INTERNAL.originalAttachShadow!, this, [init]);
      if (init.mode === 'open') {
        queueMicrotask(() => {
          observeRoot(shadowRoot);
          void runDomRules({ reason: 'attach-shadow', root: shadowRoot });
        });
      }
      return shadowRoot;
    };

    INTERNAL.shadowHookInstalled = true;
  }

  function scheduleNavigation(reason: string): void {
    if (INTERNAL.navigationTimer) globalWindow.clearTimeout(INTERNAL.navigationTimer);
    INTERNAL.navigationTimer = globalWindow.setTimeout(() => {
      INTERNAL.navigationTimer = 0;
      const nextUrl = location.href;
      const previousUrl = INTERNAL.currentUrl;
      if (nextUrl === previousUrl && reason !== 'pageshow') return;

      INTERNAL.currentUrl = nextUrl;
      debug.info('dom', `Navigation via ${reason}: ${previousUrl} → ${nextUrl}`);
      dispatchBlockerEvent('navigation', { reason, previousUrl, url: nextUrl });
      void runDomRules({ reason: `navigation:${reason}` });
    }, CONFIG.navigationDebounceMs);
  }

  function installNavigationHooks(): void {
    if (INTERNAL.navigationInstalled) return;

    for (const methodName of ['pushState', 'replaceState'] as const) {
      const original = history[methodName] as any;
      INTERNAL.originalHistoryMethods.set(methodName, original);
      (history as any)[methodName] = function blockerHistory(this: History, ...args: any[]) {
        const result = Reflect.apply(original, this, args);
        scheduleNavigation(methodName);
        return result;
      };
    }

    globalWindow.addEventListener('popstate', () => scheduleNavigation('popstate'));
    globalWindow.addEventListener('hashchange', () => scheduleNavigation('hashchange'));
    globalWindow.addEventListener('pageshow', () => scheduleNavigation('pageshow'));
    INTERNAL.navigationInstalled = true;
  }

  function installStyles(): void {
    if (INTERNAL.stylesInstalled) return;
    const cssText = '.blocker-hidden{display:none!important;visibility:hidden!important;pointer-events:none!important;}';

    if (typeof globalWindow.GM_addStyle === 'function') {
      globalWindow.GM_addStyle(cssText);
    } else {
      const style = document.createElement('style');
      style.dataset.blockerVersion = SCRIPT.version;
      style.textContent = cssText;
      (document.head || document.documentElement)?.appendChild(style);
    }
    INTERNAL.stylesInstalled = true;
  }

  function configure(nextConfig: Partial<BlockerConfig> = {}): BlockerConfig {
    Object.assign(CONFIG, nextConfig);

    if (CONFIG.interceptFetch && !INTERNAL.fetchInstalled) installFetchInterceptor();
    if (!CONFIG.interceptFetch && INTERNAL.fetchInstalled) uninstallFetchInterceptor();
    if (CONFIG.interceptScripts && !INTERNAL.scriptInterceptorsInstalled) installScriptInterceptors();
    if (!CONFIG.interceptScripts && INTERNAL.scriptInterceptorsInstalled) uninstallScriptInterceptors();

    debug.info('plugin', 'Configuration updated.', { ...CONFIG });
    return { ...CONFIG };
  }


  const EASYLIST_QUALITY_RANK: Record<EasyListConversionQuality, number> = {
    exact: 0,
    equivalent: 1,
    lossy: 2,
    unsupported: 3,
  };

  const EASYLIST_PASSIVE_RESOURCE_OPTIONS = new Set([
    'image',
    'media',
    'font',
    'stylesheet',
    'object',
    'subdocument',
    'document',
    'ping',
    'websocket',
  ]);

  function mergeEasyListQuality(
    current: EasyListConversionQuality,
    next: EasyListConversionQuality,
  ): EasyListConversionQuality {
    return EASYLIST_QUALITY_RANK[next] > EASYLIST_QUALITY_RANK[current] ? next : current;
  }

  function easyListWarning(
    code: string,
    message: string,
    details: Partial<EasyListWarning> = {},
  ): EasyListWarning {
    return {
      severity: details.severity || 'warning',
      code,
      message,
      ...details,
    };
  }

  function escapeEasyListCssString(value: unknown): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\A ');
  }

  function escapeEasyListRegexSource(value: string): string {
    return value.replace(/\//g, '\\/');
  }

  function serializeEasyListTextMatcher(
    matcher: TextMatcher,
    ruleId?: string,
  ): { value: string | null; quality: EasyListConversionQuality; warnings: EasyListWarning[] } {
    if (typeof matcher === 'string') {
      return {
        value: `"${escapeEasyListCssString(matcher)}"`,
        quality: 'equivalent',
        warnings: [],
      };
    }

    if (matcher instanceof RegExp) {
      const supportedFlags = matcher.flags.replace(/[gyd]/g, '');
      const warnings: EasyListWarning[] = [];
      let quality: EasyListConversionQuality = 'equivalent';

      if (supportedFlags !== matcher.flags) {
        quality = 'lossy';
        warnings.push(easyListWarning(
          'text-regexp-flags',
          `Stateful RegExp flags "${matcher.flags}" cannot be preserved in a cosmetic filter.`,
          { ruleId },
        ));
      }

      return {
        value: `/${escapeEasyListRegexSource(matcher.source)}/${supportedFlags}`,
        quality,
        warnings,
      };
    }

    return {
      value: null,
      quality: 'unsupported',
      warnings: [
        easyListWarning(
          'selector-function-text',
          'Function-based text matchers cannot be serialized to EasyList.',
          { ruleId },
        ),
      ],
    };
  }

  function staticHostValues(
    matcher: HostMatcher | undefined,
    ruleId?: string,
  ): { hosts: string[] | null; quality: EasyListConversionQuality; warnings: EasyListWarning[] } {
    if (matcher == null || matcher === '*') {
      return { hosts: [], quality: 'exact', warnings: [] };
    }

    if (typeof matcher === 'string') {
      if (matcher === '*.*') {
        return {
          hosts: [],
          quality: 'lossy',
          warnings: [
            easyListWarning(
              'host-star-dot-star',
              '"*.*" is treated as a global host during EasyList conversion.',
              { ruleId },
            ),
          ],
        };
      }

      const normalized = matcher.startsWith('*.') ? matcher.slice(2) : matcher;
      return {
        hosts: [normalized],
        quality: matcher.startsWith('*.') ? 'equivalent' : 'exact',
        warnings: [],
      };
    }

    if (Array.isArray(matcher)) {
      const hosts: string[] = [];
      const warnings: EasyListWarning[] = [];
      let quality: EasyListConversionQuality = 'exact';

      for (const entry of matcher) {
        const result = staticHostValues(entry, ruleId);
        quality = mergeEasyListQuality(quality, result.quality);
        warnings.push(...result.warnings);

        if (result.hosts == null) {
          return { hosts: null, quality: 'unsupported', warnings };
        }

        for (const host of result.hosts) {
          if (!hosts.includes(host)) hosts.push(host);
        }
      }

      return { hosts, quality, warnings };
    }

    return {
      hosts: null,
      quality: 'unsupported',
      warnings: [
        easyListWarning(
          'dynamic-host-matcher',
          'RegExp/function host matchers cannot be represented as static EasyList domains.',
          { ruleId },
        ),
      ],
    };
  }

  function applySelectorSuffix(selectors: string[], suffix: string): string[] {
    if (!selectors.length) return [suffix];

    const output = new Array<string>(selectors.length);
    for (let index = 0; index < selectors.length; index += 1) {
      output[index] = `${selectors[index]}${suffix}`;
    }
    return output;
  }

  function applySelectorDescendant(selectors: string[], selector: string, combinator = ' '): string[] {
    if (!selectors.length) return [selector];

    const output = new Array<string>(selectors.length);
    for (let index = 0; index < selectors.length; index += 1) {
      output[index] = selectors[index]
        ? `${selectors[index]}${combinator}${selector}`
        : selector;
    }
    return output;
  }

  function selectorTargetToEasyList(
    target: SelectorTarget,
    options: EasyListRuleCompileOptions = {},
    ruleId?: string,
  ): EasyListSelectorCompileResult {
    const targetMode = options.target || 'ublock';

    if (typeof target === 'string') {
      return { selectors: [target], quality: 'exact', warnings: [] };
    }

    if (Array.isArray(target)) {
      const selectors: string[] = [];
      const warnings: EasyListWarning[] = [];
      let quality: EasyListConversionQuality = 'exact';

      for (const entry of target) {
        const result = selectorTargetToEasyList(entry, options, ruleId);
        quality = mergeEasyListQuality(quality, result.quality);
        warnings.push(...result.warnings);
        selectors.push(...result.selectors);
      }

      return {
        selectors: Array.from(new Set(selectors)),
        quality,
        warnings,
      };
    }

    if (!(target instanceof SelectQuery)) {
      if (target && typeof target === 'object' && 'selector' in target && typeof target.selector === 'string') {
        return { selectors: [target.selector], quality: 'exact', warnings: [] };
      }

      if (target && typeof target === 'object' && 'xpath' in target && typeof target.xpath === 'string') {
        if (targetMode === 'ublock') {
          return {
            selectors: [`:xpath(${target.xpath})`],
            quality: 'equivalent',
            warnings: [],
          };
        }

        return {
          selectors: [],
          quality: 'unsupported',
          warnings: [
            easyListWarning(
              'xpath-easylist',
              'XPath selectors require the uBlock target.',
              { ruleId },
            ),
          ],
        };
      }

      return {
        selectors: [],
        quality: 'unsupported',
        warnings: [
          easyListWarning(
            'dynamic-selector-target',
            'Function/custom selector targets cannot be serialized to EasyList.',
            { ruleId },
          ),
        ],
      };
    }

    let selectors: string[] = [''];
    let quality: EasyListConversionQuality = 'exact';
    const warnings: EasyListWarning[] = [];

    const mark = (
      nextQuality: EasyListConversionQuality,
      warning?: EasyListWarning,
    ): void => {
      quality = mergeEasyListQuality(quality, nextQuality);
      if (warning) warnings.push(warning);
    };

    for (const step of target.steps) {
      switch (step.type) {
        case SELECT_STEPS.CSS:
          selectors = applySelectorDescendant(selectors, String(step.selector || ''));
          break;

        case SELECT_STEPS.XPATH:
          if (targetMode !== 'ublock') {
            mark(
              'unsupported',
              easyListWarning('xpath-easylist', 'XPath selectors require the uBlock target.', { ruleId }),
            );
            selectors = [];
          } else {
            selectors = applySelectorSuffix(selectors, `:xpath(${String(step.expression || '')})`);
            mark('equivalent');
          }
          break;

        case SELECT_STEPS.TEXT: {
          if (targetMode !== 'ublock') {
            mark(
              'unsupported',
              easyListWarning('text-easylist', 'Text matching requires procedural uBlock syntax.', { ruleId }),
            );
            selectors = [];
            break;
          }

          const text = serializeEasyListTextMatcher(step.expected as TextMatcher, ruleId);
          mark(text.quality);
          warnings.push(...text.warnings);

          if (!text.value) {
            selectors = [];
            break;
          }

          const sourceSelector = String(
            (step.options as TextMatchOptions | undefined)?.selector ||
            ':is(button,a,[role="button"],label,summary,p,span,div)',
          );
          selectors = applySelectorDescendant(selectors, sourceSelector);
          selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
          mark('equivalent');
          break;
        }

        case SELECT_STEPS.ROLE: {
          const roleSelector = `[role="${escapeEasyListCssString(step.roleName)}"]`;
          selectors = selectors.map((selector) => selector ? `${selector}${roleSelector}` : roleSelector);

          const name = (step.options as { name?: TextMatcher } | undefined)?.name;
          if (name != null) {
            if (targetMode !== 'ublock') {
              mark(
                'unsupported',
                easyListWarning('role-name-easylist', 'Accessible-name matching requires uBlock procedural syntax.', { ruleId }),
              );
              selectors = [];
              break;
            }

            const text = serializeEasyListTextMatcher(name, ruleId);
            mark(mergeEasyListQuality(text.quality, 'lossy'));
            warnings.push(...text.warnings);
            warnings.push(easyListWarning(
              'role-name-semantics',
              'role({name}) also considers aria-label in Blocker; :has-text() only sees rendered text.',
              { ruleId },
            ));
            if (!text.value) {
              selectors = [];
              break;
            }
            selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
          }
          break;
        }

        case SELECT_STEPS.TEST_ID: {
          const attribute = String(step.attribute || 'data-testid');
          const value = escapeEasyListCssString(step.value);
          selectors = applySelectorSuffix(selectors, `[${attribute}="${value}"]`);
          break;
        }

        case SELECT_STEPS.TAG: {
          const tag = String(step.tagName || '*').toLowerCase();
          selectors = selectors.map((selector) => selector ? `${selector}:is(${tag})` : tag);
          break;
        }

        case SELECT_STEPS.CUSTOM_SOURCE:
        case SELECT_STEPS.FILTER_CUSTOM:
          mark(
            'unsupported',
            easyListWarning('custom-selector-code', 'Custom selector callbacks cannot be exported.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.WITHIN:
          mark(
            'unsupported',
            easyListWarning('within-selector', 'within() has runtime scoping semantics that cannot be safely flattened.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.FILTER_TEXT: {
          if (targetMode !== 'ublock') {
            mark(
              'unsupported',
              easyListWarning('text-easylist', 'hasText() requires the uBlock target.', { ruleId }),
            );
            selectors = [];
            break;
          }

          const text = serializeEasyListTextMatcher(step.expected as TextMatcher, ruleId);
          mark(text.quality);
          warnings.push(...text.warnings);
          if (!text.value) {
            selectors = [];
            break;
          }
          selectors = applySelectorSuffix(selectors, `:has-text(${text.value})`);
          break;
        }

        case SELECT_STEPS.FILTER_ATTRIBUTE: {
          const expected = step.expected;
          if (
            typeof expected === 'function' ||
            expected instanceof RegExp ||
            Array.isArray(expected)
          ) {
            mark(
              'unsupported',
              easyListWarning(
                'attribute-dynamic-match',
                `attribute("${String(step.name)}") uses a matcher that cannot be represented as CSS.`,
                { ruleId },
              ),
            );
            selectors = [];
            break;
          }

          if (expected == null) {
            mark('equivalent');
            break;
          }

          selectors = applySelectorSuffix(
            selectors,
            `[${String(step.name)}="${escapeEasyListCssString(expected)}"]`,
          );
          break;
        }

        case SELECT_STEPS.FILTER_ATTRIBUTE_EXISTS:
          selectors = applySelectorSuffix(selectors, `[${String(step.name)}]`);
          break;

        case SELECT_STEPS.FILTER_PROPERTY:
          mark(
            'unsupported',
            easyListWarning('property-selector', 'JavaScript property filters cannot be exported to EasyList.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.FILTER_VISIBLE:
          mark(
            'lossy',
            easyListWarning(
              'visible-selector',
              'visible() is omitted because cosmetic filters are persistent and do not share Blocker visibility timing semantics.',
              { ruleId, severity: 'info' },
            ),
          );
          break;

        case SELECT_STEPS.FILTER_HIDDEN:
          mark(
            'unsupported',
            easyListWarning('hidden-selector', 'hidden() cannot be represented without broadening the match.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.FILTER_ENABLED:
          selectors = applySelectorSuffix(selectors, ':not(:disabled):not([aria-disabled="true"])');
          break;

        case SELECT_STEPS.FILTER_DISABLED:
          selectors = applySelectorSuffix(selectors, ':is(:disabled,[aria-disabled="true"])');
          break;

        case SELECT_STEPS.FILTER_IN_VIEWPORT:
          mark(
            'unsupported',
            easyListWarning('viewport-selector', 'inViewport() is runtime geometry and has no EasyList equivalent.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.FILTER_HAS: {
          const nested = selectorTargetToEasyList(step.target as SelectorTarget, options, ruleId);
          mark(nested.quality);
          warnings.push(...nested.warnings);

          if (!nested.selectors.length) {
            selectors = [];
            break;
          }

          selectors = applySelectorSuffix(selectors, `:has(${nested.selectors.join(',')})`);
          break;
        }

        case SELECT_STEPS.FILTER_NOT: {
          const nested = selectorTargetToEasyList(step.target as SelectorTarget, options, ruleId);
          mark(nested.quality);
          warnings.push(...nested.warnings);

          if (!nested.selectors.length) {
            selectors = [];
            break;
          }

          selectors = applySelectorSuffix(selectors, `:not(${nested.selectors.join(',')})`);
          break;
        }

        case SELECT_STEPS.CLOSEST:
          if (targetMode !== 'ublock') {
            mark(
              'unsupported',
              easyListWarning('closest-easylist', 'closest() requires uBlock :upward().', { ruleId }),
            );
            selectors = [];
          } else {
            selectors = applySelectorSuffix(selectors, `:upward(${String(step.selector)})`);
            mark('equivalent');
          }
          break;

        case SELECT_STEPS.PARENT:
          if (targetMode !== 'ublock') {
            mark(
              'unsupported',
              easyListWarning('parent-easylist', 'parent() requires uBlock :upward().', { ruleId }),
            );
            selectors = [];
          } else {
            const parentSelector = step.selector ? String(step.selector) : '1';
            selectors = applySelectorSuffix(selectors, `:upward(${parentSelector})`);
            mark('equivalent');
          }
          break;

        case SELECT_STEPS.CHILDREN:
          selectors = applySelectorDescendant(selectors, String(step.selector || '*'), ' > ');
          break;

        case SELECT_STEPS.DESCENDANTS:
          selectors = applySelectorDescendant(selectors, String(step.selector || '*'));
          break;

        case SELECT_STEPS.NEXT:
          selectors = applySelectorDescendant(selectors, String(step.selector || '*'), ' + ');
          break;

        case SELECT_STEPS.PREVIOUS:
          mark(
            'unsupported',
            easyListWarning('previous-selector', 'previous() cannot be represented as a forward CSS selection.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.SHADOW:
          mark(
            'unsupported',
            easyListWarning('shadow-selector', 'Open Shadow DOM traversal is runtime-specific and is not exported.', { ruleId }),
          );
          selectors = [];
          break;

        case SELECT_STEPS.UNIQUE:
          break;

        case SELECT_STEPS.FIRST:
        case SELECT_STEPS.LAST:
        case SELECT_STEPS.AT:
        case SELECT_STEPS.LIMIT:
          mark(
            'unsupported',
            easyListWarning(
              'positional-result-selector',
              `${step.type} operates on the result set, not CSS structural position, so it cannot be safely exported.`,
              { ruleId },
            ),
          );
          selectors = [];
          break;

        case SELECT_STEPS.FALLBACK: {
          const queries = Array.isArray(step.queries) ? step.queries as SelectorTarget[] : [];
          const fallbackSelectors: string[] = [];

          for (const fallbackQuery of queries) {
            const fallback = selectorTargetToEasyList(fallbackQuery, options, ruleId);
            warnings.push(...fallback.warnings);
            quality = mergeEasyListQuality(quality, fallback.quality);
            fallbackSelectors.push(...fallback.selectors);
          }

          if (fallbackSelectors.length) {
            selectors.push(...fallbackSelectors);
            selectors = Array.from(new Set(selectors.filter(Boolean)));
            mark(
              'lossy',
              easyListWarning(
                'fallback-selector',
                'fallback() priority cannot be represented statically; all serializable alternatives are emitted.',
                { ruleId },
              ),
            );
          }
          break;
        }

        default:
          mark(
            'unsupported',
            easyListWarning('unknown-selector-step', `Unknown selector step "${String(step.type)}".`, { ruleId }),
          );
          selectors = [];
          break;
      }

      if (!selectors.length && quality === 'unsupported') break;
    }

    return {
      selectors: Array.from(new Set(selectors.filter(Boolean))),
      quality,
      warnings,
    };
  }

  function cosmeticDomainPrefix(
    host: HostMatcher | undefined,
    ruleId: string,
  ): {
    prefix: string | null;
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    const result = staticHostValues(host, ruleId);
    if (result.hosts == null) {
      return { prefix: null, quality: 'unsupported', warnings: result.warnings };
    }

    return {
      prefix: result.hosts.length ? result.hosts.join(',') : '',
      quality: result.quality,
      warnings: result.warnings,
    };
  }

  function compileDomRuleToEasyList(
    rule: DomRule,
    options: EasyListRuleCompileOptions,
    ruleId: string,
    ruleName: string,
  ): EasyListConversion {
    const targetMode = options.target || 'ublock';
    const removal = options.removal || 'preserve';
    const host = cosmeticDomainPrefix(rule.host, ruleId);
    const filters: string[] = [];
    const warnings = [...host.warnings];
    let quality = host.quality;

    if (host.prefix == null) {
      quality = 'unsupported';
    }

    if (rule.pathname != null || rule.match || rule.when || rule.before || rule.run || rule.after) {
      quality = mergeEasyListQuality(quality, 'unsupported');
      warnings.push(easyListWarning(
        'dom-runtime-conditions',
        'DOM rule pathname/match/when/hooks cannot be represented by cosmetic filters.',
        { ruleId },
      ));
    }

    for (const action of rule.actions || []) {
      if (action.action !== ACTIONS.HIDE && action.action !== ACTIONS.REMOVE) {
        quality = mergeEasyListQuality(quality, 'unsupported');
        warnings.push(easyListWarning(
          'dom-action-unsupported',
          `DOM action "${action.action}" cannot be represented by EasyList.`,
          { ruleId },
        ));
        continue;
      }

      for (const target of action.targets || []) {
        const compiled = selectorTargetToEasyList(target, options, ruleId);
        quality = mergeEasyListQuality(quality, compiled.quality);
        warnings.push(...compiled.warnings);

        for (const selector of compiled.selectors) {
          if (host.prefix == null) continue;

          let finalSelector = selector;

          if (action.action === ACTIONS.REMOVE) {
            if (targetMode === 'ublock' && removal === 'preserve') {
              finalSelector += ':remove()';
              quality = mergeEasyListQuality(quality, 'equivalent');
            } else {
              quality = mergeEasyListQuality(quality, 'lossy');
              warnings.push(easyListWarning(
                'remove-becomes-hide',
                'remove() is exported as cosmetic hiding for this target/profile.',
                { ruleId, severity: 'info' },
              ));
            }
          }

          filters.push(`${host.prefix}##${finalSelector}`);
        }
      }
    }

    if (!filters.length && quality !== 'unsupported') {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'dom-no-exportable-actions',
        'The DOM rule has no exportable cosmetic actions.',
        { ruleId },
      ));
    }

    return {
      ruleId,
      ruleName,
      ruleType: RULE_TYPES.DOM,
      quality,
      filters: Array.from(new Set(filters)),
      warnings,
    };
  }

  function regexpToEasyListNetworkPattern(
    expression: RegExp,
    ruleId: string,
  ): {
    pattern: string;
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    const warnings: EasyListWarning[] = [];
    let quality: EasyListConversionQuality = 'equivalent';

    if (expression.flags.replace(/[i]/g, '')) {
      quality = 'lossy';
      warnings.push(easyListWarning(
        'network-regexp-flags',
        `RegExp flags "${expression.flags}" are not fully representable in static network syntax.`,
        { ruleId },
      ));
    }

    return {
      pattern: `/${escapeEasyListRegexSource(expression.source)}/`,
      quality,
      warnings,
    };
  }

  function scalarNetworkValue(
    value: unknown,
    ruleId: string,
    label: string,
  ): {
    values: string[] | null;
    regexValues: RegExp[];
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    if (value == null) {
      return { values: [], regexValues: [], quality: 'exact', warnings: [] };
    }

    if (Array.isArray(value)) {
      const values: string[] = [];
      const regexValues: RegExp[] = [];
      const warnings: EasyListWarning[] = [];
      let quality: EasyListConversionQuality = 'exact';

      for (const entry of value) {
        const nested = scalarNetworkValue(entry, ruleId, label);
        quality = mergeEasyListQuality(quality, nested.quality);
        warnings.push(...nested.warnings);

        if (nested.values == null) {
          return { values: null, regexValues, quality: 'unsupported', warnings };
        }

        values.push(...nested.values);
        regexValues.push(...nested.regexValues);
      }

      return { values, regexValues, quality, warnings };
    }

    if (value instanceof RegExp) {
      return {
        values: [],
        regexValues: [value],
        quality: 'equivalent',
        warnings: [],
      };
    }

    if (typeof value === 'function') {
      return {
        values: null,
        regexValues: [],
        quality: 'unsupported',
        warnings: [
          easyListWarning(
            'network-dynamic-match',
            `Function matcher for ${label} cannot be exported.`,
            { ruleId },
          ),
        ],
      };
    }

    return {
      values: [String(value)],
      regexValues: [],
      quality: 'exact',
      warnings: [],
    };
  }

  function appendNetworkOptions(
    filter: string,
    options: readonly string[],
  ): string {
    const clean = options.filter(Boolean);
    if (!clean.length) return filter;
    return `${filter}$${clean.join(',')}`;
  }

  function fetchMatchToEasyListPatterns(
    match: FetchMatch | undefined,
    targetMode: EasyListTarget,
    ruleId: string,
  ): {
    patterns: string[];
    options: string[];
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    if (match == null) {
      return {
        patterns: ['*'],
        options: [],
        quality: 'lossy',
        warnings: [
          easyListWarning(
            'network-match-all',
            'A match-all fetch rule is exported as a global network filter.',
            { ruleId, severity: 'info' },
          ),
        ],
      };
    }

    if (typeof match === 'string') {
      return { patterns: [match], options: [], quality: 'equivalent', warnings: [] };
    }

    if (match instanceof RegExp) {
      const converted = regexpToEasyListNetworkPattern(match, ruleId);
      return {
        patterns: [converted.pattern],
        options: [],
        quality: converted.quality,
        warnings: converted.warnings,
      };
    }

    if (typeof match === 'function') {
      return {
        patterns: [],
        options: [],
        quality: 'unsupported',
        warnings: [easyListWarning('fetch-function-match', 'Function fetch matchers cannot be exported.', { ruleId })],
      };
    }

    if (Array.isArray(match)) {
      const patterns: string[] = [];
      const warnings: EasyListWarning[] = [];
      let quality: EasyListConversionQuality = 'exact';
      let commonOptions: string[] | null = null;

      for (const entry of match) {
        const nested = fetchMatchToEasyListPatterns(entry, targetMode, ruleId);
        patterns.push(...nested.patterns);
        warnings.push(...nested.warnings);
        quality = mergeEasyListQuality(quality, nested.quality);

        const normalizedOptions = [...nested.options].sort();
        if (commonOptions == null) {
          commonOptions = normalizedOptions;
        } else if (
          normalizedOptions.length !== commonOptions.length ||
          normalizedOptions.some((option, index) => option !== commonOptions![index])
        ) {
          warnings.push(easyListWarning(
            'fetch-array-option-mismatch',
            'OR-ed fetch match alternatives require different static filter options and cannot be safely merged.',
            { ruleId },
          ));
          return { patterns: [], options: [], quality: 'unsupported', warnings };
        }
      }

      return {
        patterns: Array.from(new Set(patterns)),
        options: commonOptions || [],
        quality,
        warnings,
      };
    }

    const objectMatch = match as FetchMatchObject;
    const warnings: EasyListWarning[] = [];
    let quality: EasyListConversionQuality = 'exact';

    if (objectMatch.test) {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'fetch-test-callback',
        'Fetch match.test() cannot be serialized.',
        { ruleId },
      ));
    }

    const hosts = staticHostValues(objectMatch.hostname, ruleId);
    warnings.push(...hosts.warnings);
    quality = mergeEasyListQuality(quality, hosts.quality);

    if (hosts.hosts == null) {
      return { patterns: [], options: [], quality: 'unsupported', warnings };
    }

    const hostValues = scalarNetworkValue(objectMatch.host, ruleId, 'host');
    const paths = scalarNetworkValue(objectMatch.pathname, ruleId, 'pathname');
    const searches = scalarNetworkValue(objectMatch.search, ruleId, 'search');
    const methods = scalarNetworkValue(objectMatch.method, ruleId, 'method');

    for (const result of [hostValues, paths, searches, methods]) {
      warnings.push(...result.warnings);
      quality = mergeEasyListQuality(quality, result.quality);
    }

    if (
      hostValues.values == null ||
      paths.values == null ||
      searches.values == null ||
      methods.values == null
    ) {
      return { patterns: [], options: [], quality: 'unsupported', warnings };
    }

    if (
      hostValues.regexValues.length ||
      paths.regexValues.length ||
      searches.regexValues.length
    ) {
      quality = mergeEasyListQuality(quality, 'unsupported');
      warnings.push(easyListWarning(
        'network-field-regexp',
        'RegExp host/path/search fields combined inside an object matcher are not exported automatically.',
        { ruleId },
      ));
      return { patterns: [], options: [], quality, warnings };
    }

    const domains = hosts.hosts.length
      ? hosts.hosts
      : hostValues.values.length
        ? hostValues.values
        : [''];

    const pathValues = paths.values.length ? paths.values : [''];
    const searchValues = searches.values.length ? searches.values : [''];
    const patterns: string[] = [];

    for (const domain of domains) {
      for (const pathname of pathValues) {
        for (const search of searchValues) {
          if (domain) {
            let pattern = `||${domain}`;
            if (pathname) pattern += pathname.startsWith('/') ? pathname : `/${pathname}`;
            else pattern += '^';
            if (search) pattern += search.startsWith('?') ? search : `?${search}`;
            patterns.push(pattern);
          } else if (pathname || search) {
            patterns.push(`${pathname}${search}`);
            quality = mergeEasyListQuality(quality, 'lossy');
          } else {
            patterns.push('*');
            quality = mergeEasyListQuality(quality, 'lossy');
          }
        }
      }
    }

    if (paths.values.length || searches.values.length) {
      quality = mergeEasyListQuality(quality, 'lossy');
      warnings.push(easyListWarning(
        'network-path-exactness',
        'Blocker object pathname/search fields use exact matching; EasyList URL patterns are generally substring/prefix based.',
        { ruleId, severity: 'info' },
      ));
    }

    const optionList: string[] = [];
    if (methods.values.length) {
      if (targetMode === 'ublock') {
        for (const method of methods.values) optionList.push(`method=${method.toLowerCase()}`);
      } else {
        quality = mergeEasyListQuality(quality, 'lossy');
        warnings.push(easyListWarning(
          'method-easylist',
          'HTTP method constraints are omitted for the EasyList target.',
          { ruleId },
        ));
      }
    }

    return {
      patterns: Array.from(new Set(patterns)),
      options: optionList,
      quality,
      warnings,
    };
  }

  function compileFetchRuleToEasyList(
    rule: FetchRule,
    options: EasyListRuleCompileOptions,
    ruleId: string,
    ruleName: string,
  ): EasyListConversion {
    const targetMode = options.target || 'ublock';
    const match = fetchMatchToEasyListPatterns(rule.match, targetMode, ruleId);
    const warnings = [...match.warnings];
    let quality = match.quality;

    if (
      rule.action !== FETCH_ACTIONS.BLOCK &&
      rule.action !== FETCH_ACTIONS.ALLOW &&
      rule.action != null
    ) {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'fetch-action-unsupported',
        `Fetch action "${rule.action}" cannot be represented by a static filter.`,
        { ruleId },
      ));
    }

    const allow = rule.action === FETCH_ACTIONS.ALLOW;
    const filters = match.patterns.map((pattern) =>
      `${allow ? '@@' : ''}${appendNetworkOptions(pattern, match.options)}`,
    );

    return {
      ruleId,
      ruleName,
      ruleType: RULE_TYPES.FETCH,
      quality,
      filters: quality === 'unsupported' ? [] : filters,
      warnings,
    };
  }

  function scriptKindOptions(
    matcher: ValueMatcher<ScriptKind, ScriptContext> | undefined,
    targetMode: EasyListTarget,
    ruleId: string,
  ): {
    groups: string[][];
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    if (matcher == null) {
      return {
        groups: [['script']],
        quality: 'lossy',
        warnings: [
          easyListWarning(
            'script-kind-unspecified',
            'A script rule without kind is narrowed to network script resources during export.',
            { ruleId, severity: 'info' },
          ),
        ],
      };
    }

    const values = Array.isArray(matcher) ? matcher : [matcher];
    const groups: string[][] = [];
    const warnings: EasyListWarning[] = [];
    let quality: EasyListConversionQuality = 'exact';

    for (const entry of values) {
      if (typeof entry === 'function' || entry instanceof RegExp || Array.isArray(entry)) {
        quality = 'unsupported';
        warnings.push(easyListWarning(
          'script-kind-dynamic',
          'Dynamic/RegExp script kind matchers cannot be exported.',
          { ruleId },
        ));
        continue;
      }

      switch (entry) {
        case SCRIPT_KINDS.ELEMENT:
        case SCRIPT_KINDS.PRELOAD:
        case SCRIPT_KINDS.MODULE_PRELOAD:
          groups.push(['script']);
          break;

        case SCRIPT_KINDS.XHR:
          groups.push([targetMode === 'ublock' ? 'xhr' : 'xmlhttprequest']);
          break;

        case SCRIPT_KINDS.WORKER:
        case SCRIPT_KINDS.SHARED_WORKER:
        case SCRIPT_KINDS.SERVICE_WORKER:
          if (targetMode === 'ublock') {
            groups.push(['worker']);
            quality = mergeEasyListQuality(quality, 'equivalent');
          } else {
            groups.push(['script']);
            quality = mergeEasyListQuality(quality, 'lossy');
            warnings.push(easyListWarning(
              'worker-easylist',
              'Worker kinds are approximated as script for the EasyList target.',
              { ruleId },
            ));
          }
          break;

        default:
          quality = 'unsupported';
          warnings.push(easyListWarning(
            'dynamic-code-script-kind',
            `Script kind "${String(entry)}" is runtime-only and has no static network equivalent.`,
            { ruleId },
          ));
          break;
      }
    }

    return {
      groups: groups.length ? groups : [],
      quality,
      warnings,
    };
  }

  function scriptMatchToEasyListPatterns(
    match: ScriptMatch | undefined,
    rule: ScriptRule,
    targetMode: EasyListTarget,
    ruleId: string,
  ): {
    patterns: string[];
    optionGroups: string[][];
    domainOptions: string[];
    quality: EasyListConversionQuality;
    warnings: EasyListWarning[];
  } {
    const warnings: EasyListWarning[] = [];
    let quality: EasyListConversionQuality = 'exact';

    const kindSource = rule.kind ??
      (match && typeof match === 'object' && !Array.isArray(match) && !(match instanceof RegExp)
        ? (match as ScriptMatchObject).kind
        : undefined);
    const kinds = scriptKindOptions(kindSource, targetMode, ruleId);
    warnings.push(...kinds.warnings);
    quality = mergeEasyListQuality(quality, kinds.quality);

    const pageHosts = staticHostValues(rule.host, ruleId);
    warnings.push(...pageHosts.warnings);
    quality = mergeEasyListQuality(quality, pageHosts.quality);
    if (pageHosts.hosts == null) {
      return {
        patterns: [],
        optionGroups: [],
        domainOptions: [],
        quality: 'unsupported',
        warnings,
      };
    }

    const domainOptions = pageHosts.hosts.length
      ? [`domain=${pageHosts.hosts.join('|')}`]
      : [];

    if (match == null) {
      return {
        patterns: ['*'],
        optionGroups: kinds.groups,
        domainOptions,
        quality: mergeEasyListQuality(quality, 'lossy'),
        warnings,
      };
    }

    if (typeof match === 'string') {
      return { patterns: [match], optionGroups: kinds.groups, domainOptions, quality, warnings };
    }

    if (match instanceof RegExp) {
      const converted = regexpToEasyListNetworkPattern(match, ruleId);
      warnings.push(...converted.warnings);
      quality = mergeEasyListQuality(quality, converted.quality);
      return {
        patterns: [converted.pattern],
        optionGroups: kinds.groups,
        domainOptions,
        quality,
        warnings,
      };
    }

    if (typeof match === 'function' || Array.isArray(match)) {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'script-complex-match',
        'Function/array top-level script matches are not exported automatically.',
        { ruleId },
      ));
      return { patterns: [], optionGroups: [], domainOptions, quality, warnings };
    }

    const objectMatch = match as ScriptMatchObject;

    if (
      objectMatch.inline != null ||
      objectMatch.code != null ||
      objectMatch.type != null ||
      objectMatch.test
    ) {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'script-runtime-match-fields',
        'inline/code/type/test script match fields require runtime inspection and cannot be exported.',
        { ruleId },
      ));
    }

    const host = staticHostValues(objectMatch.hostname, ruleId);
    warnings.push(...host.warnings);
    quality = mergeEasyListQuality(quality, host.quality);
    if (host.hosts == null) {
      return { patterns: [], optionGroups: [], domainOptions, quality: 'unsupported', warnings };
    }

    const src = scalarNetworkValue(objectMatch.src ?? objectMatch.url, ruleId, 'script src/url');
    const paths = scalarNetworkValue(objectMatch.pathname, ruleId, 'script pathname');
    const methods = scalarNetworkValue(objectMatch.method, ruleId, 'script method');

    for (const result of [src, paths, methods]) {
      warnings.push(...result.warnings);
      quality = mergeEasyListQuality(quality, result.quality);
    }

    if (src.values == null || paths.values == null || methods.values == null) {
      return { patterns: [], optionGroups: [], domainOptions, quality: 'unsupported', warnings };
    }

    if (src.regexValues.length) {
      if (host.hosts.length || paths.values.length) {
        quality = 'unsupported';
        warnings.push(easyListWarning(
          'script-combined-regexp',
          'RegExp src/url combined with hostname/path fields is not exported automatically.',
          { ruleId },
        ));
        return { patterns: [], optionGroups: [], domainOptions, quality, warnings };
      }

      const patterns: string[] = [];
      for (const expression of src.regexValues) {
        const converted = regexpToEasyListNetworkPattern(expression, ruleId);
        patterns.push(converted.pattern);
        warnings.push(...converted.warnings);
        quality = mergeEasyListQuality(quality, converted.quality);
      }

      return { patterns, optionGroups: kinds.groups, domainOptions, quality, warnings };
    }

    const domains = host.hosts.length ? host.hosts : [''];
    const urls = src.values.length ? src.values : [''];
    const pathValues = paths.values.length ? paths.values : [''];
    const patterns: string[] = [];

    for (const domain of domains) {
      for (const url of urls) {
        for (const pathname of pathValues) {
          if (url) {
            patterns.push(url);
          } else if (domain) {
            let pattern = `||${domain}`;
            if (pathname) pattern += pathname.startsWith('/') ? pathname : `/${pathname}`;
            else pattern += '^';
            patterns.push(pattern);
          } else if (pathname) {
            patterns.push(pathname);
            quality = mergeEasyListQuality(quality, 'lossy');
          } else {
            patterns.push('*');
            quality = mergeEasyListQuality(quality, 'lossy');
          }
        }
      }
    }

    if (methods.values.length) {
      if (targetMode === 'ublock') {
        for (const group of kinds.groups) {
          for (const method of methods.values) group.push(`method=${method.toLowerCase()}`);
        }
      } else {
        quality = mergeEasyListQuality(quality, 'lossy');
        warnings.push(easyListWarning(
          'script-method-easylist',
          'Script method constraints are omitted for the EasyList target.',
          { ruleId },
        ));
      }
    }

    return {
      patterns: Array.from(new Set(patterns)),
      optionGroups: kinds.groups,
      domainOptions,
      quality,
      warnings,
    };
  }

  function compileScriptRuleToEasyList(
    rule: ScriptRule,
    options: EasyListRuleCompileOptions,
    ruleId: string,
    ruleName: string,
  ): EasyListConversion {
    const targetMode = options.target || 'ublock';
    const compiled = scriptMatchToEasyListPatterns(rule.match, rule, targetMode, ruleId);
    const warnings = [...compiled.warnings];
    let quality = compiled.quality;

    if (
      rule.action !== SCRIPT_ACTIONS.BLOCK &&
      rule.action !== SCRIPT_ACTIONS.ALLOW &&
      rule.action != null
    ) {
      quality = 'unsupported';
      warnings.push(easyListWarning(
        'script-action-unsupported',
        `Script action "${rule.action}" cannot be represented by static filter syntax.`,
        { ruleId },
      ));
    }

    const allow = rule.action === SCRIPT_ACTIONS.ALLOW;
    const filters: string[] = [];

    if (quality !== 'unsupported') {
      for (const pattern of compiled.patterns) {
        const groups = compiled.optionGroups.length ? compiled.optionGroups : [[]];
        for (const optionGroup of groups) {
          filters.push(
            `${allow ? '@@' : ''}${appendNetworkOptions(
              pattern,
              [...optionGroup, ...compiled.domainOptions],
            )}`,
          );
        }
      }
    }

    return {
      ruleId,
      ruleName,
      ruleType: RULE_TYPES.SCRIPT,
      quality,
      filters: Array.from(new Set(filters)),
      warnings,
    };
  }

  function compileRuleToEasyList(
    rule: Rule,
    options: EasyListRuleCompileOptions = {},
  ): EasyListConversion {
    const type = (rule as Rule).type || RULE_TYPES.DOM;
    const ruleId = rule.id || 'unregistered-rule';
    const ruleName = rule.name || ruleId;

    if (type === RULE_TYPES.FETCH) {
      return compileFetchRuleToEasyList(rule as FetchRule, options, ruleId, ruleName);
    }

    if (type === RULE_TYPES.SCRIPT) {
      return compileScriptRuleToEasyList(rule as ScriptRule, options, ruleId, ruleName);
    }

    return compileDomRuleToEasyList(rule as DomRule, options, ruleId, ruleName);
  }

  function exportEasyList(options: EasyListExportOptions = {}): EasyListExportResult {
    const targetMode = options.target || 'ublock';
    const unsupportedMode = options.unsupported || 'comment';
    const sourceRules = options.rules
      ? [...options.rules]
      : getRules({ enabled: options.includeDisabled ? undefined : true });

    const conversions: EasyListConversion[] = [];
    const warnings: EasyListWarning[] = [];
    const output: string[] = [];

    if (options.comments !== false) {
      output.push(
        `! ${options.title || `${SCRIPT.name} ${SCRIPT.version}`}`,
        `! Generated by Blocker.easyList.export()`,
        `! Target: ${targetMode}`,
        `! Generated: ${new Date().toISOString()}`,
        '',
      );
    }

    const stats: EasyListExportStats = {
      rules: sourceRules.length,
      filters: 0,
      exact: 0,
      equivalent: 0,
      lossy: 0,
      unsupported: 0,
    };

    for (const rule of sourceRules) {
      const conversion = compileRuleToEasyList(rule, {
        target: targetMode,
        unsupported: unsupportedMode,
        removal: options.removal || 'preserve',
      });

      conversions.push(conversion);
      warnings.push(...conversion.warnings);
      stats[conversion.quality] += 1;

      if (conversion.quality === 'unsupported' || !conversion.filters.length) {
        if (unsupportedMode === 'throw') {
          throw new TypeError(
            `Rule "${conversion.ruleId}" cannot be exported to ${targetMode}.`,
          );
        }

        if (unsupportedMode === 'comment' && options.comments !== false) {
          output.push(
            `! BLOCKER-UNSUPPORTED [${conversion.ruleId}] ${conversion.ruleName}`,
            ...conversion.warnings.map((warning) => `!   ${warning.code}: ${warning.message}`),
            '',
          );
        }

        continue;
      }

      if (options.comments !== false) {
        output.push(
          `! [${conversion.quality.toUpperCase()}] ${conversion.ruleId} · ${conversion.ruleName}`,
        );
      }

      output.push(...conversion.filters, '');
      stats.filters += conversion.filters.length;
    }

    while (output.length && output[output.length - 1] === '') output.pop();

    return {
      target: targetMode,
      text: output.join('\n'),
      conversions,
      warnings,
      stats,
    };
  }

  function hashEasyListLine(value: string): string {
    let hash = 0x811c9dc5;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }

    return (hash >>> 0).toString(36);
  }

  function splitEasyListOptions(line: string): { pattern: string; options: string[] } {
    let escaped = false;
    let regex = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === '/' && index === 0) {
        regex = true;
        continue;
      }

      if (regex && character === '/' && index > 0) {
        regex = false;
        continue;
      }

      if (!regex && character === '$') {
        return {
          pattern: line.slice(0, index),
          options: line.slice(index + 1).split(',').map((entry) => entry.trim()).filter(Boolean),
        };
      }
    }

    return { pattern: line, options: [] };
  }

  function easyListPatternToRegExp(pattern: string): RegExp {
    if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
      const end = pattern.lastIndexOf('/');
      const source = pattern.slice(1, end);
      return new RegExp(source, 'i');
    }

    let source = '';
    let index = 0;
    let anchorStart = false;
    let anchorEnd = false;

    if (pattern.startsWith('||')) {
      source += '^(?:[^:/?#]+:)?(?://)?(?:[^/?#]*\\.)?';
      index = 2;
    } else if (pattern.startsWith('|')) {
      source += '^';
      index = 1;
      anchorStart = true;
    }

    let endIndex = pattern.length;
    if (endIndex > index && pattern.endsWith('|') && !pattern.endsWith('\\|')) {
      anchorEnd = true;
      endIndex -= 1;
    }

    for (; index < endIndex; index += 1) {
      const character = pattern[index];

      if (character === '*') {
        source += '.*';
      } else if (character === '^') {
        source += '(?:[^A-Za-z0-9_.%-]|$)';
      } else {
        source += character.replace(/[.*+?${}()|[\]\\]/g, '\\$&');
      }
    }

    if (anchorEnd) source += '$';
    if (!anchorStart && !source.startsWith('^')) source = source || '.*';

    return new RegExp(source, 'i');
  }

  function parseEasyListMatcher(value: string): TextMatcher {
    const trimmed = value.trim();

    if (trimmed.startsWith('/') && trimmed.lastIndexOf('/') > 0) {
      const end = trimmed.lastIndexOf('/');
      const source = trimmed.slice(1, end);
      const flags = trimmed.slice(end + 1).replace(/[^imsu]/g, '');
      try {
        return new RegExp(source, flags);
      } catch {
        return source;
      }
    }

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).replace(/\\(["'\\])/g, '$1');
    }

    return trimmed;
  }

  function findClosingPseudoParen(
    selector: string,
    openIndex: number,
  ): number {
    let depth = 1;
    let quote = '';
    let regex = false;
    let escaped = false;

    for (let index = openIndex + 1; index < selector.length; index += 1) {
      const character = selector[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (quote) {
        if (character === quote) quote = '';
        continue;
      }

      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }

      if (character === '/' && selector[index - 1] !== '\\') {
        regex = !regex;
        continue;
      }

      if (regex) continue;

      if (character === '(') depth += 1;
      else if (character === ')') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }

    return -1;
  }

  function parseProceduralCosmeticSelector(
    rawSelector: string,
    line: number,
    warnings: EasyListWarning[],
  ): {
    query: SelectQuery | string | null;
    remove: boolean;
  } {
    let selector = rawSelector.trim();
    let remove = false;

    if (selector.endsWith(':remove()')) {
      remove = true;
      selector = selector.slice(0, -':remove()'.length);
    }

    const tokenExpression = /:(has-text|upward|xpath)\(/g;
    tokenExpression.lastIndex = 0;
    const first = tokenExpression.exec(selector);

    if (!first) {
      return { query: selector, remove };
    }

    let query = select(first.index > 0 ? selector.slice(0, first.index) : undefined);
    let cursor = first.index;
    tokenExpression.lastIndex = first.index;

    while (cursor < selector.length) {
      tokenExpression.lastIndex = cursor;
      const match = tokenExpression.exec(selector);

      if (!match || match.index !== cursor) {
        const trailing = selector.slice(cursor).trim();
        if (trailing) {
          warnings.push(easyListWarning(
            'cosmetic-procedural-trailing',
            `Unsupported trailing selector syntax "${trailing}".`,
            { line, source: rawSelector },
          ));
          return { query: null, remove };
        }
        break;
      }

      const openIndex = match.index + match[0].length - 1;
      const closeIndex = findClosingPseudoParen(selector, openIndex);

      if (closeIndex < 0) {
        warnings.push(easyListWarning(
          'cosmetic-unclosed-pseudo',
          `Unclosed :${match[1]}() pseudo.`,
          { line, source: rawSelector },
        ));
        return { query: null, remove };
      }

      const argument = selector.slice(openIndex + 1, closeIndex).trim();

      if (match[1] === 'has-text') {
        query = query.hasText(parseEasyListMatcher(argument));
      } else if (match[1] === 'upward') {
        if (/^\d+$/.test(argument)) {
          const amount = Number(argument);
          if (amount !== 1) {
            warnings.push(easyListWarning(
              'upward-distance',
              `:upward(${amount}) is approximated by ${amount} parent() steps.`,
              { line, source: rawSelector, severity: 'info' },
            ));
          }
          for (let step = 0; step < Math.max(0, amount); step += 1) query = query.parent();
        } else {
          query = query.closest(argument);
        }
      } else if (match[1] === 'xpath') {
        query = query.xpath(argument);
      }

      cursor = closeIndex + 1;
    }

    return { query, remove };
  }

  function parseEasyListDomains(
    raw: string,
    line: number,
    warnings: EasyListWarning[],
  ): HostMatcher | undefined {
    if (!raw) return undefined;

    const hosts: string[] = [];

    for (const entry of raw.split(',')) {
      const host = entry.trim();
      if (!host) continue;

      if (host.startsWith('~')) {
        warnings.push(easyListWarning(
          'negative-cosmetic-domain',
          `Excluded cosmetic domain "${host}" is not representable by a Blocker host matcher.`,
          { line, source: raw },
        ));
        continue;
      }

      hosts.push(host);
    }

    if (!hosts.length) return undefined;
    return hosts.length === 1 ? hosts[0] : hosts;
  }

  function parseCosmeticEasyListLine(
    lineText: string,
    lineNumber: number,
    options: EasyListImportOptions,
    warnings: EasyListWarning[],
  ): Rule[] | null {
    const exceptionIndex = lineText.indexOf('#@#');
    if (exceptionIndex >= 0) {
      warnings.push(easyListWarning(
        'cosmetic-exception',
        'Cosmetic exception filters (#@#) are not representable because Blocker has no cosmetic allow-rule layer.',
        { line: lineNumber, source: lineText },
      ));
      return null;
    }

    let separator = '##';
    let index = lineText.indexOf(separator);

    if (index < 0) {
      separator = '#?#';
      index = lineText.indexOf(separator);
    }

    if (index < 0) return null;

    const rawDomains = lineText.slice(0, index);
    const rawSelector = lineText.slice(index + separator.length);
    const parsed = parseProceduralCosmeticSelector(rawSelector, lineNumber, warnings);

    if (!parsed.query) return null;

    const host = parseEasyListDomains(rawDomains, lineNumber, warnings);
    const actionMode = options.cosmeticAction || 'preserve';
    const shouldRemove = actionMode === 'remove' || (actionMode === 'preserve' && parsed.remove);
    const idPrefix = options.idPrefix || 'easylist';

    return [{
      id: `${idPrefix}-cosmetic-${lineNumber}-${hashEasyListLine(lineText)}`,
      name: `Imported cosmetic filter ${lineNumber}`,
      type: RULE_TYPES.DOM,
      host,
      actions: [
        shouldRemove
          ? remove(parsed.query)
          : hide(parsed.query),
      ],
    }];
  }

  function parseNetworkDomainOption(
    option: string,
  ): { include: string[]; exclude: string[] } {
    const value = option.slice('domain='.length);
    const include: string[] = [];
    const exclude: string[] = [];

    for (const part of value.split('|')) {
      const domain = part.trim();
      if (!domain) continue;
      if (domain.startsWith('~')) exclude.push(domain.slice(1));
      else include.push(domain);
    }

    return { include, exclude };
  }

  function pageHostAllowed(hostname: string, include: readonly string[], exclude: readonly string[]): boolean {
    const matches = (domain: string): boolean =>
      hostname === domain || hostname.endsWith(`.${domain}`);

    for (const domain of exclude) if (matches(domain)) return false;
    if (!include.length) return true;
    for (const domain of include) if (matches(domain)) return true;
    return false;
  }

  function parseNetworkEasyListLine(
    lineText: string,
    lineNumber: number,
    options: EasyListImportOptions,
    warnings: EasyListWarning[],
  ): Rule[] | null {
    const allow = lineText.startsWith('@@');
    const raw = allow ? lineText.slice(2) : lineText;
    const split = splitEasyListOptions(raw);
    const pattern = split.pattern.trim();

    if (!pattern) return null;

    let matcher: RegExp;
    try {
      matcher = easyListPatternToRegExp(pattern);
    } catch (error) {
      warnings.push(easyListWarning(
        'network-pattern-invalid',
        `Could not parse network pattern: ${error instanceof Error ? error.message : String(error)}`,
        { line: lineNumber, source: lineText },
      ));
      return null;
    }

    const optionSet = new Set(split.options.map((entry) => entry.toLowerCase()));
    const idPrefix = options.idPrefix || 'easylist';
    const domainOption = split.options.find((entry) => entry.toLowerCase().startsWith('domain='));
    const pageDomains = domainOption
      ? parseNetworkDomainOption(domainOption)
      : { include: [] as string[], exclude: [] as string[] };

    const methodOption = split.options.find((entry) => entry.toLowerCase().startsWith('method='));
    const method = methodOption ? methodOption.slice('method='.length).toUpperCase() : '';

    for (const option of optionSet) {
      const base = option.startsWith('~') ? option.slice(1) : option;

      if (
        option.startsWith('~') &&
        (
          base === 'script' ||
          base === 'xhr' ||
          base === 'xmlhttprequest' ||
          base === 'worker' ||
          EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(base)
        )
      ) {
        warnings.push(easyListWarning(
          'negative-resource-option',
          `Negated resource option "${option}" cannot be safely reproduced by Blocker's interceptor surfaces.`,
          { line: lineNumber, source: lineText },
        ));
        return null;
      }

      if (
        base.startsWith('redirect=') ||
        base.startsWith('redirect-rule=') ||
        base.startsWith('removeparam=') ||
        base === 'badfilter'
      ) {
        warnings.push(easyListWarning(
          'behavioral-network-option',
          `Behavioral option "${option}" changes filter semantics and is not imported as a plain block/allow rule.`,
          { line: lineNumber, source: lineText },
        ));
        return null;
      }

      if (
        EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(base) ||
        base === 'third-party' ||
        base === '1p' ||
        base === '3p' ||
        base === 'important'
      ) {
        warnings.push(easyListWarning(
          'network-option-partial',
          `Network option "${option}" is not fully reproduced by the browser runtime.`,
          { line: lineNumber, source: lineText, severity: 'info' },
        ));
      }
    }

    const script = optionSet.has('script');
    const xhr = optionSet.has('xhr') || optionSet.has('xmlhttprequest');
    const worker = optionSet.has('worker');
    const explicitPassive = Array.from(optionSet).some((entry) =>
      EASYLIST_PASSIVE_RESOURCE_OPTIONS.has(entry.replace(/^~/, '')),
    );

    if (explicitPassive && !script && !xhr && !worker) {
      warnings.push(easyListWarning(
        'passive-resource-not-intercepted',
        'This filter targets a passive browser subresource that Blocker does not currently intercept.',
        { line: lineNumber, source: lineText },
      ));
      return null;
    }

    const testPage = (hostname: string): boolean =>
      pageHostAllowed(hostname, pageDomains.include, pageDomains.exclude);
    const testUrl = (url: string): boolean => {
      matcher.lastIndex = 0;
      return matcher.test(url);
    };

    const rules: Rule[] = [];
    const baseId = `${idPrefix}-network-${lineNumber}-${hashEasyListLine(lineText)}`;

    const createFetchRule = (suffix: string): FetchRule => ({
      id: `${baseId}-${suffix}`,
      name: `Imported network filter ${lineNumber}`,
      type: RULE_TYPES.FETCH,
      action: allow ? FETCH_ACTIONS.ALLOW : FETCH_ACTIONS.BLOCK,
      match: (context) =>
        testPage(context.page.hostname) &&
        (!method || context.method === method) &&
        testUrl(context.href),
    });

    const createScriptRule = (
      suffix: string,
      kinds: readonly ScriptKind[],
    ): ScriptRule => ({
      id: `${baseId}-${suffix}`,
      name: `Imported executable-resource filter ${lineNumber}`,
      type: RULE_TYPES.SCRIPT,
      host: pageDomains.include.length
        ? (pageDomains.include.length === 1 ? pageDomains.include[0] : pageDomains.include)
        : undefined,
      kind: kinds,
      action: allow ? SCRIPT_ACTIONS.ALLOW : SCRIPT_ACTIONS.BLOCK,
      match: (context) =>
        testPage(context.page.hostname) &&
        (!method || !context.method || context.method === method) &&
        testUrl(context.url),
    });

    if (script) {
      rules.push(createScriptRule('script', [
        SCRIPT_KINDS.ELEMENT,
        SCRIPT_KINDS.PRELOAD,
        SCRIPT_KINDS.MODULE_PRELOAD,
      ]));
      return rules;
    }

    if (xhr) {
      rules.push(
        createFetchRule('fetch'),
        createScriptRule('xhr', [SCRIPT_KINDS.XHR]),
      );
      return rules;
    }

    if (worker) {
      rules.push(createScriptRule('worker', [
        SCRIPT_KINDS.WORKER,
        SCRIPT_KINDS.SHARED_WORKER,
        SCRIPT_KINDS.SERVICE_WORKER,
      ]));
      return rules;
    }

    // Generic network filters cover the surfaces Blocker can intercept:
    // fetch, XHR and executable resources. Passive img/media/css requests are
    // intentionally not claimed as covered.
    rules.push(
      createFetchRule('fetch'),
      createScriptRule('executable', [
        SCRIPT_KINDS.ELEMENT,
        SCRIPT_KINDS.PRELOAD,
        SCRIPT_KINDS.MODULE_PRELOAD,
        SCRIPT_KINDS.XHR,
        SCRIPT_KINDS.WORKER,
        SCRIPT_KINDS.SHARED_WORKER,
        SCRIPT_KINDS.SERVICE_WORKER,
      ]),
    );

    warnings.push(easyListWarning(
      'generic-network-runtime-scope',
      'Generic imported network filter covers fetch/XHR/executable resources, not every passive browser request.',
      { line: lineNumber, source: lineText, severity: 'info' },
    ));

    return rules;
  }

  function parseEasyList(
    text: string,
    options: EasyListImportOptions = {},
  ): EasyListImportResult {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const rules: Rule[] = [];
    const warnings: EasyListWarning[] = [];
    const unsupportedLines: Array<{ line: number; text: string; reason: string }> = [];
    const stats: EasyListImportStats = {
      lines: lines.length,
      parsed: 0,
      rules: 0,
      cosmetic: 0,
      network: 0,
      ignored: 0,
      unsupported: 0,
    };

    for (let index = 0; index < lines.length; index += 1) {
      const lineNumber = index + 1;
      const lineText = lines[index].trim();

      if (
        !lineText ||
        lineText.startsWith('!') ||
        lineText.startsWith('[')
      ) {
        stats.ignored += 1;
        continue;
      }

      const warningStart = warnings.length;
      let parsedRules: Rule[] | null = null;
      let kind: 'cosmetic' | 'network' = 'network';

      if (
        lineText.includes('##') ||
        lineText.includes('#@#') ||
        lineText.includes('#?#')
      ) {
        kind = 'cosmetic';
        parsedRules = parseCosmeticEasyListLine(lineText, lineNumber, options, warnings);
      } else {
        parsedRules = parseNetworkEasyListLine(lineText, lineNumber, options, warnings);
      }

      if (!parsedRules?.length) {
        const reason = warnings.slice(warningStart).map((warning) => warning.message).join(' ') ||
          'Unsupported or unrecognized filter.';
        unsupportedLines.push({ line: lineNumber, text: lineText, reason });
        stats.unsupported += 1;
        continue;
      }

      rules.push(...parsedRules);
      stats.parsed += 1;
      stats.rules += parsedRules.length;
      stats[kind] += 1;
    }

    const registeredRules = options.register
      ? addRules(rules, {
          replace: options.replace,
          run: options.run,
        })
      : [];

    return {
      rules,
      registeredRules,
      warnings,
      unsupportedLines,
      stats,
    };
  }

  function validateEasyList(
    text: string,
    options: EasyListImportOptions = {},
  ): EasyListValidationResult {
    const result = parseEasyList(text, { ...options, register: false });
    return {
      valid: result.unsupportedLines.length === 0,
      warnings: result.warnings,
      unsupportedLines: result.unsupportedLines,
      stats: result.stats,
    };
  }

  const easyList: EasyListAPI = Object.freeze({
    export: exportEasyList,
    parse: parseEasyList,
    import(text: string, options: EasyListImportOptions = {}): EasyListImportResult {
      return parseEasyList(text, { ...options, register: options.register ?? true });
    },
    compileRule: compileRuleToEasyList,
    compileSelector: selectorTargetToEasyList,
    validate: validateEasyList,
  });


  function processQueue(): void {
    const queue = globalWindow.BlockerQueue;
    if (!Array.isArray(queue)) return;

    const entries = queue.splice(0);
    for (const entry of entries) {
      try {
        if (typeof entry === 'function') entry(PUBLIC_API);
        else if (Array.isArray(entry)) addRules(entry as readonly Rule[]);
        else addRule(entry as Rule);
      } catch (error) {
        debug.error('plugin', 'Queued plugin registration failed.', error);
      }
    }
  }

  const PUBLIC_API: BlockerAPI = {
    __isBlockerRuntime: true,
    name: SCRIPT.name,
    version: SCRIPT.version,
    ACTIONS,
    FETCH_ACTIONS,
    SCRIPT_ACTIONS,
    SCRIPT_KINDS,
    RULE_TYPES,
    SELECT_STEPS,
    SelectQuery,
    select,
    query,
    selectAny,
    selectFirst,
    resolve: resolveSelector,
    hide,
    remove,
    replace,
    click,
    setAttributes,
    removeAttributes,
    setProperties,
    addClass,
    removeClass,
    unwrap,
    customAction,
    blockScript,
    allowScript,
    redirectScript,
    modifyScript,
    customScriptRule,
    addScriptRule,
    addScriptRules,
    addRule,
    addRules,
    getRule,
    getRules,
    removeRule,
    clearRules,
    enableRule: (id: string) => setRuleEnabled(id, true),
    disableRule: (id: string) => setRuleEnabled(id, false),
    run: runDomRules,
    runRules: runDomRules,
    configure,
    getPageContext,
    installFetchInterceptor,
    uninstallFetchInterceptor,
    installScriptInterceptors,
    uninstallScriptInterceptors,
    debug,
    easyList,
    get ready() { return INTERNAL.initialized; },
    get rules() { return getRules(); },
    get domRules() { return [...INTERNAL.domRules]; },
    get fetchRules() { return [...INTERNAL.fetchRules]; },
    get scriptRules() { return [...INTERNAL.scriptRules]; },
    get originalFetch() { return INTERNAL.originalFetch; },
  };

  Object.defineProperty(globalWindow, SCRIPT.globalName, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: PUBLIC_API,
  });

  globalWindow.BlockerQueue ||= [];

  function initialize(): void {
    if (INTERNAL.initialized) return;
    const startedAt = performance.now();
    INTERNAL.initialized = true;

    installStyles();
    installFetchInterceptor();
    installScriptInterceptors();
    installShadowHook();
    installNavigationHooks();

    if (document.documentElement) observeRoot(document.documentElement);
    if (CONFIG.processExistingShadowRoots) discoverShadowRoots(document);

    processQueue();
    void runDomRules({ reason: 'initial' });

    debug.success('plugin', `${SCRIPT.name} v${SCRIPT.version} ready in ${duration(startedAt)}.`);
    dispatchBlockerEvent('ready', { version: SCRIPT.version, api: PUBLIC_API });
  }

  if (document.documentElement) initialize();
  else document.addEventListener('readystatechange', initialize, { once: true });

  /**
   * ========================================================================
   * EXAMPLES
   * ========================================================================
   *
   * 1. Simple CSS removal
   *
   * Blocker.addRule({
   *   id: 'remove-ads',
   *   host: 'example.com',
   *   actions: [Blocker.remove(Blocker.select('.advertisement'))],
   * });
   *
   * 2. Text + visibility + ancestor
   *
   * Blocker.addRule({
   *   id: 'remove-promoted-cards',
   *   actions: [
   *     Blocker.remove(
   *       Blocker.select('span')
   *         .hasText(/promoted|patrocinado/i)
   *         .visible()
   *         .closest('article'),
   *     ),
   *   ],
   * });
   *
   * 3. Accessible role and name
   *
   * Blocker.addRule({
   *   id: 'accept-cookie-dialog',
   *   actions: [
   *     Blocker.click(
   *       Blocker.select()
   *         .role('button', { name: /accept all|aceitar todos/i })
   *         .visible()
   *         .enabled()
   *         .first(),
   *     ),
   *   ],
   * });
   *
   * 4. Test id with fallbacks
   *
   * const closeButton = Blocker.select()
   *   .testId('close-button')
   *   .fallback(
   *     Blocker.select().role('button', { name: /close|fechar/i }),
   *     Blocker.select().xpath('//button[@aria-label="Close"]'),
   *   );
   *
   * 5. Cards that contain a sponsored child
   *
   * Blocker.addRule({
   *   id: 'remove-sponsored-products',
   *   actions: [
   *     Blocker.remove(
   *       Blocker.select('.product-card')
   *         .has(Blocker.select('[data-sponsored="true"]'))
   *         .visible(),
   *     ),
   *   ],
   * });
   *
   * 6. Modify attributes and properties
   *
   * Blocker.addRule({
   *   id: 'unlock-video',
   *   actions: [
   *     Blocker.removeAttributes(Blocker.select('video'), 'controlsList', 'disablePictureInPicture'),
   *     Blocker.setProperties(Blocker.select('video'), { playbackRate: 1 }),
   *   ],
   * });
   *
   * 7. Custom action, rerunnable on mutations
   *
   * Blocker.addRule({
   *   id: 'normalize-videos',
   *   actions: [
   *     Blocker.customAction(
   *       Blocker.select('video'),
   *       (video) => {
   *         if (video instanceof HTMLVideoElement) video.playbackRate = 1;
   *       },
   *       { once: false },
   *     ),
   *   ],
   * });
   *
   * 8. Block fetch request with a synthetic 204
   *
   * Blocker.addRule({
   *   id: 'block-analytics',
   *   type: Blocker.RULE_TYPES.FETCH,
   *   match: {
   *     hostname: '*.example.com',
   *     pathname: /collect|analytics|track/i,
   *     method: 'POST',
   *   },
   *   action: Blocker.FETCH_ACTIONS.BLOCK,
   *   response: { status: 204 },
   * });
   *
   * 9. Redirect a fetch
   *
   * Blocker.addRule({
   *   id: 'redirect-api',
   *   type: Blocker.RULE_TYPES.FETCH,
   *   match: { hostname: 'old-api.example.com' },
   *   action: Blocker.FETCH_ACTIONS.REDIRECT,
   *   redirect: ({ url }) => `https://api.example.com${url.pathname}${url.search}`,
   * });
   *
   * 10. Modify request headers
   *
   * Blocker.addRule({
   *   id: 'inject-debug-header',
   *   type: Blocker.RULE_TYPES.FETCH,
   *   match: { hostname: 'api.example.com' },
   *   action: Blocker.FETCH_ACTIONS.MODIFY_REQUEST,
   *   modifyRequest: ({ input, init, headers }) => ({
   *     input,
   *     init: {
   *       ...init,
   *       headers: new Headers([...headers, ['x-debug', '1']]),
   *     },
   *   }),
   * });
   *
   * 11. Modify a JSON response
   *
   * Blocker.addRule({
   *   id: 'disable-api-ads',
   *   type: Blocker.RULE_TYPES.FETCH,
   *   match: { hostname: 'api.example.com', pathname: '/config' },
   *   action: Blocker.FETCH_ACTIONS.MODIFY_RESPONSE,
   *   async modifyResponse(response) {
   *     const data = await response.clone().json();
   *     data.adsEnabled = false;
   *     return new Response(JSON.stringify(data), {
   *       status: response.status,
   *       statusText: response.statusText,
   *       headers: response.headers,
   *     });
   *   },
   * });
   *
   * 12. Block external scripts and preloads
   *
   * Blocker.addScriptRule({
   *   id: 'block-google-tracking-scripts',
   *   match: {
   *     kind: [
   *       Blocker.SCRIPT_KINDS.ELEMENT,
   *       Blocker.SCRIPT_KINDS.PRELOAD,
   *       Blocker.SCRIPT_KINDS.MODULE_PRELOAD,
   *     ],
   *     src: /googletagmanager|google-analytics|doubleclick/i,
   *   },
   *   action: Blocker.SCRIPT_ACTIONS.BLOCK,
   * });
   *
   * 13. Block inline bootstrap scripts
   *
   * Blocker.addScriptRule({
   *   id: 'block-inline-tracker',
   *   match: {
   *     kind: Blocker.SCRIPT_KINDS.INLINE,
   *     inline: /window\.__trackerBootstrap|gtag\(/i,
   *   },
   * });
   *
   * 14. Block XHR-delivered JavaScript payloads
   *
   * Blocker.addScriptRule({
   *   id: 'block-remote-eval-payload',
   *   match: {
   *     kind: Blocker.SCRIPT_KINDS.XHR,
   *     pathname: /\/(?:bundle|payload|loader)\.js$/i,
   *   },
   * });
   *
   * 15. Block workers
   *
   * Blocker.addScriptRule({
   *   id: 'block-tracker-workers',
   *   match: {
   *     kind: [
   *       Blocker.SCRIPT_KINDS.WORKER,
   *       Blocker.SCRIPT_KINDS.SHARED_WORKER,
   *       Blocker.SCRIPT_KINDS.SERVICE_WORKER,
   *     ],
   *     src: /tracker|analytics|fingerprint/i,
   *   },
   * });
   *
   * 16. Block eval, Function and string timers
   *
   * Blocker.addScriptRules([
   *   {
   *     id: 'block-suspicious-eval',
   *     match: { kind: Blocker.SCRIPT_KINDS.EVAL, code: /document\.cookie|fingerprint/i },
   *   },
   *   {
   *     id: 'block-suspicious-function',
   *     match: { kind: Blocker.SCRIPT_KINDS.FUNCTION, code: /WebSocket|localStorage/i },
   *   },
   *   {
   *     id: 'block-string-timers',
   *     match: { kind: Blocker.SCRIPT_KINDS.TIMER, code: /tracker|advert/i },
   *   },
   * ]);
   *
   * 17. Redirect a broken SDK
   *
   * Blocker.addScriptRule({
   *   id: 'redirect-broken-sdk',
   *   match: { src: 'https://cdn.example.com/sdk.js' },
   *   action: Blocker.SCRIPT_ACTIONS.REDIRECT,
   *   redirect: 'https://rod.migos.club/shims/sdk.js',
   * });
   *
   * 18. Modify an inline script
   *
   * Blocker.addScriptRule({
   *   id: 'neutralize-bootstrap-flag',
   *   match: { kind: Blocker.SCRIPT_KINDS.INLINE, code: /adsEnabled\s*=\s*true/ },
   *   action: Blocker.SCRIPT_ACTIONS.MODIFY,
   *   modify: ({ code }) => code.replace(/adsEnabled\s*=\s*true/g, 'adsEnabled=false'),
   * });
   *
   * 19. Helper form
   *
   * Blocker.addRule(Blocker.blockScript(
   *   {
   *     kind: Blocker.SCRIPT_KINDS.DOCUMENT_WRITE,
   *     code: /<script[^>]+advertising/i,
   *   },
   *   {
   *     id: 'block-document-write-ad-script',
   *     name: 'Block advertising scripts written by document.write',
   *   },
   * ));
   *
   * 20. Queue rules before the runtime loads
   *
   * window.BlockerQueue ||= [];
   * window.BlockerQueue.push((Blocker) => {
   *   Blocker.addRule({
   *     id: 'queued-rule',
   *     host: 'example.com',
   *     actions: [Blocker.remove(Blocker.select('.popup'))],
   *   });
   * });
   *
   * 21. Runtime configuration
   *
   * Blocker.configure({
   *   debug: false,
   *   observerDebounceMs: 32,
   *   mutationFullScanThreshold: 120,
   *   interceptWebAssembly: false,
   * });
   *
   * 22. Export current Blocker rules to uBlock-compatible syntax
   *
   * const ublock = Blocker.easyList.export({
   *   target: 'ublock',
   *   comments: true,
   *   unsupported: 'comment',
   *   removal: 'preserve',
   * });
   *
   * console.log(ublock.text);
   * console.table(ublock.conversions);
   *
   * 23. Export portable EasyList syntax
   *
   * const easylist = Blocker.easyList.export({
   *   target: 'easylist',
   *   removal: 'hide',
   * });
   *
   * 24. Parse without registering
   *
   * const parsed = Blocker.easyList.parse(`
   *   ||doubleclick.net^$script
   *   ||analytics.example.com^$xhr
   *   youtube.com##ytd-ad-slot-renderer
   *   x.com##article:has-text(/promoted|patrocinado/i):remove()
   * `);
   *
   * console.log(parsed.rules);
   * console.table(parsed.warnings);
   *
   * 25. Import + immediately register supported filters
   *
   * Blocker.easyList.import(`
   *   ||googletagmanager.com^$script
   *   example.com##.advertisement
   * `, {
   *   register: true,
   *   cosmeticAction: 'preserve',
   * });
   *
   * 26. Compile a selector
   *
   * const selectorConversion = Blocker.easyList.compileSelector(
   *   Blocker.select('span')
   *     .hasText(/promoted|patrocinado/i)
   *     .closest('article'),
   *   { target: 'ublock' },
   * );
   *
   * // → span:has-text(/promoted|patrocinado/i):upward(article)
   *
   * 27. Compile one rule
   *
   * const ruleConversion = Blocker.easyList.compileRule({
   *   id: 'remove-promoted',
   *   host: ['x.com', 'twitter.com'],
   *   actions: [
   *     Blocker.remove(
   *       Blocker.select('article').hasText(/promoted|patrocinado/i),
   *     ),
   *   ],
   * }, { target: 'ublock' });
   *
   * 28. Validate a downloaded list before registering
   *
   * const validation = Blocker.easyList.validate(listText);
   * if (!validation.valid) {
   *   console.table(validation.unsupportedLines);
   * }
   *
   * Browser limitation:
   * JavaScript cannot universally hook the native dynamic import() operator.
   * Parser-inserted scripts can also execute before MutationObserver sees them.
   * For guaranteed network-level blocking, combine Blocker with a content blocker,
   * extension request filter, local proxy or Content-Security-Policy.
   */
})(window as BlockerWindow);
