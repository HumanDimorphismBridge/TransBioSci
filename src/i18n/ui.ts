import type { Lang } from './config';

const zh = {
  siteName: 'TransBioSci',
  skipToContent: '跳到正文',
  home: '首页',
  backHome: '首页',
  backToTissues: '返回组织列表',
  breadcrumbLabel: '当前位置',
  languageLabel: '网站语言',
  directionLabel: '方向',
  footerSources: '来源与版权',
  footerLicense: '网站源代码采用 MIT 许可；文章与图片按各自标注的授权使用。',
  placeholder: '占位',
  placeholderFigure: '占位图形',

  homeIntroTitle: 'TransBioSci',
  homeIntro: '项目简介占位：网站定位与研究目标将在公开发布前补充。',

  transTitle: 'Trans 生理知识库',
  transCardDesc: '文档与实用知识',
  dimorphismTitle: 'Human Dimorphism Knowledge Base',
  dimorphismCardDesc: '人体组织与性分化知识',
  guestbookTitle: 'Guestbook',
  guestbookCardDesc: '意见与选题反馈',
  contactTitle: 'Contact',
  contactCardDesc: '个人说明、联系与支持',
  sourcesTitle: '来源与版权',

  intro: 'Intro',
  toc: '目录',
  tocToggle: '文档目录',

  tissuesHeading: '人体组织',
  tissueContainer: '组织内容展示区域（预留容器）',
  tissueRelated: '相关文章',
  tissueEmpty: '该组织在当前方向下暂无内容。',

  guestbookIntro:
    '欢迎留言！无需注册或登录，留言提交后将公开展示。请尊重其他访客，避免重复留言或刷屏。',
  guestbookVoteRule: '点赞和点踩请遵守每人一票的原则，投票可以修改或撤回。',
  guestbookContactRule: '如果遇到问题，或希望删除已发布的留言，请通过 {contact} 给开发者发送邮件。',
  nicknameLabel: '昵称（选填）',
  bodyLabel: '留言内容',
  submit: '发送留言',
  guestbookNotConnected: '留言服务尚未接入：当前页面为界面占位，暂不能发布或投票。',
  allMessages: '全部留言',
  noMessages: '暂无留言。',

  aboutHeading: '关于我',
  aboutPlaceholder: '个人说明占位：待补充。',
  emailHeading: '联系邮箱',
  emailPlaceholder: '邮箱占位：待补充。删除留言等请求也将通过此邮箱处理。',
  supportHeading: '支持项目',
  qrPlaceholder: '二维码占位',

  sourcesIntro:
    '本页按材料记录作者、原始来源、授权状态和转载条件，涵盖文章、图片及其他第三方材料。',
  sourcesLicense:
    '网站源代码采用 MIT License，该许可仅适用于源代码。文章、图片和第三方材料按各自的授权条件使用。仅注明来源不构成转载许可；未获得转载许可的第三方内容不得完整转载。',
  sourcesTableCaption: '来源与授权记录',
  colMaterial: '材料',
  colAuthor: '作者',
  colSource: '原始来源',
  colLicense: '授权状态',
  colTerms: '转载条件',
  sourcesEmpty: '尚无已发布材料（占位）。',

  notFoundTitle: '页面不存在',
  notFoundBody: '找不到这个页面。',
  redirecting: '正在跳转…',
};

export type UIStrings = typeof zh;

const en: UIStrings = {
  siteName: 'TransBioSci',
  skipToContent: 'Skip to content',
  home: 'Home',
  backHome: 'Home',
  backToTissues: 'Back to tissues',
  breadcrumbLabel: 'Breadcrumb',
  languageLabel: 'Site language',
  directionLabel: 'Direction',
  footerSources: 'Sources & Copyright',
  footerLicense: 'Site source code is MIT licensed; articles and images follow their own stated terms.',
  placeholder: 'Placeholder',
  placeholderFigure: 'Placeholder figure',

  homeIntroTitle: 'TransBioSci',
  homeIntro: 'Project introduction placeholder: the site’s scope and research goals will be added before public release.',

  transTitle: 'Trans Physiology Knowledge Base',
  transCardDesc: 'Documents and practical knowledge',
  dimorphismTitle: 'Human Dimorphism Knowledge Base',
  dimorphismCardDesc: 'Human tissues and sexual differentiation',
  guestbookTitle: 'Guestbook',
  guestbookCardDesc: 'Feedback and topic suggestions',
  contactTitle: 'Contact',
  contactCardDesc: 'About, contact and support',
  sourcesTitle: 'Sources & Copyright',

  intro: 'Intro',
  toc: 'Contents',
  tocToggle: 'Contents',

  tissuesHeading: 'Human tissues',
  tissueContainer: 'Tissue content area (reserved container)',
  tissueRelated: 'Related articles',
  tissueEmpty: 'No content for this tissue in the current direction yet.',

  guestbookIntro:
    'Feel free to leave a message! No account or login is required. Messages are publicly visible once submitted. Please be respectful and avoid spam or repeated posts.',
  guestbookVoteRule: 'Please cast only one vote per person. Votes can be changed or withdrawn.',
  guestbookContactRule:
    'If you encounter any issues or would like a message removed, please contact the developer by email via {contact}.',
  nicknameLabel: 'Name (optional)',
  bodyLabel: 'Message',
  submit: 'Post message',
  guestbookNotConnected: 'The guestbook service is not connected yet: this page is an interface placeholder, so posting and voting are unavailable.',
  allMessages: 'All messages',
  noMessages: 'No messages yet.',

  aboutHeading: 'About me',
  aboutPlaceholder: 'About placeholder: to be added.',
  emailHeading: 'Email',
  emailPlaceholder: 'Email placeholder: to be added. Message removal requests will also be handled at this address.',
  supportHeading: 'Support the project',
  qrPlaceholder: 'QR code placeholder',

  sourcesIntro:
    'This page records the author, original source, license status and republication terms of each material, including articles, images and other third-party materials.',
  sourcesLicense:
    'The site source code uses the MIT License, which applies to the source code only. Articles, images and third-party materials are used under their own terms. Citing a source does not grant permission to republish; third-party content without permission must not be republished in full.',
  sourcesTableCaption: 'Source and license records',
  colMaterial: 'Material',
  colAuthor: 'Author',
  colSource: 'Original source',
  colLicense: 'License status',
  colTerms: 'Republication terms',
  sourcesEmpty: 'No published materials yet (placeholder).',

  notFoundTitle: 'Page not found',
  notFoundBody: 'This page could not be found.',
  redirecting: 'Redirecting…',
};

export const UI: Record<Lang, UIStrings> = { zh, en };

export function t(lang: Lang): UIStrings {
  return UI[lang];
}
