/** 状态色调词表：Badge 与 format 的状态映射共用；放在 lib 避免 lib → components 反向依赖 */
export type BadgeTone = 'ok' | 'wait' | 'run' | 'warn' | 'off' | 'danger'
