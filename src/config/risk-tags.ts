export const RISK_TAGS = [
  { code: "ACCIDENT", name: "事故", category: "STRUCTURE", defaultSeverity: 3, defaultPriority: 4, consumerTemplate: "需要结合结构件与安全边界判断。" },
  { code: "WATER", name: "水泡", category: "ELECTRICAL", defaultSeverity: 3, defaultPriority: 4, consumerTemplate: "建议重点关注线束、电器与长期可靠性。" },
  { code: "ODOMETER", name: "调表", category: "DOCUMENT", defaultSeverity: 2, defaultPriority: 4, consumerTemplate: "建议复核维保记录和里程可信度。" },
  { code: "STRUCTURE_DAMAGE", name: "结构件变形", category: "STRUCTURE", defaultSeverity: 2, defaultPriority: 4, consumerTemplate: "结构件变化需要结合安全影响和修复记录理解。" },
  { code: "BODY_REPAIR", name: "钣金", category: "EXTERIOR", defaultSeverity: 1, defaultPriority: 2, consumerTemplate: "通常影响外观与后续漆面维护。" },
  { code: "PAINT", name: "喷漆", category: "EXTERIOR", defaultSeverity: 1, defaultPriority: 1, consumerTemplate: "属于外观修复信息，不等同于结构损伤。" },
  { code: "PART_REPLACED", name: "部件更换", category: "MECHANICAL", defaultSeverity: 1, defaultPriority: 2, consumerTemplate: "建议确认更换原因、部件质量与质保范围。" },
  { code: "LEAK", name: "渗漏", category: "MECHANICAL", defaultSeverity: 2, defaultPriority: 3, consumerTemplate: "需要结合渗漏位置和维修计划判断。" },
  { code: "ENGINE_ABNORMAL", name: "发动机异常", category: "POWERTRAIN", defaultSeverity: 3, defaultPriority: 4, consumerTemplate: "建议安排进一步工况检测并预留维修预算。" },
  { code: "CHASSIS_WEAR", name: "底盘耗损", category: "CHASSIS", defaultSeverity: 1, defaultPriority: 3, consumerTemplate: "属于使用耗损，建议纳入近期保养计划。" },
  { code: "ELECTRICAL_FAULT", name: "电器故障", category: "ELECTRICAL", defaultSeverity: 2, defaultPriority: 3, consumerTemplate: "建议确认故障是否可复现及修复记录。" },
] as const;
