import type { Lang } from './config';

/** Strings used by the guestbook browser script. `{n}` is replaced at runtime. */
const zh = {
  like: '赞',
  dislike: '踩',
  liked: '已赞',
  disliked: '已踩',
  loadMore: '加载更多',
  loading: '加载中…',
  loadFailed: '留言加载失败。',
  retry: '重试',
  posting: '发送中…',
  posted: '留言已发布。',
  counter: '{n} / 2000',
  cooldown: '{n} 秒后可再次发送',
  bodyRequired: '请填写留言内容。',
  bodyTooLong: '留言内容最多 2000 个字符。',
  nicknameTooLong: '昵称最多 40 个字符。',
  turnstile_unavailable: '人机验证加载失败，请检查网络后重试。',
  turnstile_failed: '验证未通过，请重试。',
  cooldownError: '提交过于频繁，请稍后再试。',
  duplicate: '近期已有相同留言，请勿重复提交。',
  site_busy: '留言功能暂时不可用，请稍后再试。',
  siteBusyWait: '预计约 {n} 分钟后恢复。',
  read_only: '留言功能暂时关闭，如有问题请联系开发者。',
  server_error: '提交失败，请稍后重试。',
  voteFailed: '投票失败，请稍后重试。',
  invalid: '输入有误，请检查后重试。',
};

export type GuestbookStrings = typeof zh;

const en: GuestbookStrings = {
  like: 'Like',
  dislike: 'Dislike',
  liked: 'Liked',
  disliked: 'Disliked',
  loadMore: 'Load more',
  loading: 'Loading…',
  loadFailed: 'Couldn’t load messages.',
  retry: 'Retry',
  posting: 'Posting…',
  posted: 'Your message has been posted.',
  counter: '{n} / 2000',
  cooldown: 'You can post again in {n} s',
  bodyRequired: 'Please enter a message.',
  bodyTooLong: 'Messages can be at most 2000 characters.',
  nicknameTooLong: 'Names can be at most 40 characters.',
  turnstile_unavailable: 'The human verification could not load. Please check your connection and try again.',
  turnstile_failed: 'Verification failed. Please try again.',
  cooldownError: 'You’re posting too often. Please try again later.',
  duplicate: 'An identical message was posted recently. Please don’t post it again.',
  site_busy: 'The guestbook is temporarily unavailable. Please try again later.',
  siteBusyWait: 'Expected to resume in about {n} min.',
  read_only: 'The guestbook is temporarily closed. Please contact the developer if you have questions.',
  server_error: 'Submission failed. Please try again later.',
  voteFailed: 'Voting failed. Please try again later.',
  invalid: 'Some input is invalid. Please check and try again.',
};

export const GUESTBOOK_STRINGS: Record<Lang, GuestbookStrings> = { zh, en };
