/**
 * 损伤部位现场影像配置
 *
 * 用法：后面用户给了现场照片 / 动图后，把文件放到 public/evidence/ 目录下，
 * 然后在 DAMAGE_EVIDENCE 数组里加一条即可。报告会自动在对应损伤项下面展示。
 *
 * match 字段是关键词数组，只要鉴定项目名称或部位名命中任意一个关键词就匹配。
 * kind: "image" 表示普通照片，"gif" 表示动图（GIF/MP4 循环动图）。
 */

export type EvidenceMedia = {
  /** 静态资源路径，例如 "/evidence/front-rail.jpg" 或 "/evidence/door-gap.gif" */
  src: string;
  /** 图片下方说明文字 */
  caption: string;
  /** image=普通照片，gif=动图 */
  kind: "image" | "gif";
  /** 匹配关键词：鉴定项目名或部位名包含任意一个即命中 */
  match: string[];
};

export const DAMAGE_EVIDENCE: EvidenceMedia[] = [
  // 示例（后面替换成真实素材，先留空）：
  // {
  //   src: "/evidence/front-rail.jpg",
  //   caption: "前纵梁接头处焊接修复痕迹",
  //   kind: "image",
  //   match: ["前纵梁", "纵梁", "纵梁接头"],
  // },
  // {
  //   src: "/evidence/door-gap.gif",
  //   caption: "车门缝隙不均匀，现场动图",
  //   kind: "gif",
  //   match: ["车门", "门缝", "翼子板"],
  // },
];

export function findDamageEvidence(itemName: string, zone: string): EvidenceMedia | null {
  if (DAMAGE_EVIDENCE.length === 0) return null;
  const haystack = `${zone} ${itemName}`.toLowerCase();
  for (const evidence of DAMAGE_EVIDENCE) {
    if (evidence.match.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return evidence;
    }
  }
  return null;
}
