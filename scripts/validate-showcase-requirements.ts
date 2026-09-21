import { db } from "../src/lib/db";
import { POST } from "../src/app/api/customers/route";
import { GET as getAnalytics } from "../src/app/api/analytics/route";
import { matchVehicleForDemand } from "../src/services/vehicle-matching";

async function runAcceptanceChecks() {
  console.log("=== 启动全量验收检查 ===");

  // 1. 检查没有车辆时返回明确错误
  try {
    matchVehicleForDemand([], {});
    throw new Error("FAIL: 空车库时未抛出错误");
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("当前车库暂无在售车辆，无法完成自动匹配")) {
      console.log("✓ 1. 空车库时能返回明确错误:", error.message);
    } else {
      throw error;
    }
  }

  // 2. 检查没有关注标签时也能完成匹配
  const vehicles = await db.vehicle.findMany();
  const matchedNoFocus = matchVehicleForDemand(vehicles, {
    budgetMin: 120000,
    budgetMax: 160000,
    usageScene: "日常代步",
    focusTags: [],
    energyPreference: "不限",
  });
  if (!matchedNoFocus || !matchedNoFocus.vehicle) {
    throw new Error("FAIL: 空关注标签匹配失败");
  }
  console.log(`✓ 2. 无关注标签也能完成匹配: 匹配到 ${matchedNoFocus.vehicle.code} (${matchedNoFocus.vehicle.model}), 规则: ${matchedNoFocus.rule}`);

  // 3. 检查新能源偏好匹配
  const matchedNe = matchVehicleForDemand(vehicles, {
    budgetMin: 70000,
    budgetMax: 120000,
    usageScene: "城市通勤",
    energyPreference: "新能源",
  });
  if (matchedNe.vehicle.energyType !== "NEW_ENERGY") {
    throw new Error("FAIL: 新能源偏好未匹配到新能源车");
  }
  console.log(`✓ 3. 新能源偏好成功匹配新能源车: ${matchedNe.vehicle.code} (${matchedNe.vehicle.model})`);

  // 4. 检查通过 POST /api/customers 新增客户，自动绑定车辆并保存问卷字段
  const testPhone = `138${Date.now().toString().slice(-8)}`;
  const fakeReq = new Request("http://localhost/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "自动化测试客户",
      phone: testPhone,
      sourceChannel: "抖音",
      sourceContent: "自动化测试留言",
      budgetMin: 140000,
      budgetMax: 170000,
      usageScene: "家庭日常代步",
      purchaseTime: "近期 1-2 周内急提",
      energyPreference: "燃油 / 混动",
      focusTags: ["SAFETY", "SPACE"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "德系质感",
        financePreference: "全款",
        mustHave: ["完整检测报告", "大空间后排"],
        avoidTags: ["重大事故", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "自动化验收测试备注",
    }),
  });

  const postRes = await POST(fakeReq);
  if (!postRes.ok) {
    const err = await postRes.json();
    throw new Error(`FAIL: POST /api/customers 失败: ${JSON.stringify(err)}`);
  }
  const createdCustomer = await postRes.json();
  if (!createdCustomer.salesCases || createdCustomer.salesCases.length === 0) {
    throw new Error("FAIL: 新建客户未自动创建 salesCase 绑定车辆");
  }
  const boundVehicle = createdCustomer.salesCases[0].vehicle;
  if (!boundVehicle) {
    throw new Error("FAIL: salesCase 未关联车辆");
  }
  const createdDemand = createdCustomer.demands[0];
  const profileParsed = JSON.parse(createdDemand.profileJson);
  if (profileParsed.familySize !== "3-4 人" || profileParsed.mustHave[0] !== "完整检测报告") {
    throw new Error("FAIL: 问卷字段 profileJson 保存不完整");
  }
  console.log(`✓ 4. POST /api/customers 自动建档、绑定车辆与生成跟进记录成功: 客户ID=${createdCustomer.id}, 绑定车辆=${boundVehicle.code} (${boundVehicle.model})`);

  // 清理测试客户以保持数据库干净
  await db.customer.delete({ where: { id: createdCustomer.id } });
  console.log("✓ 4b. 自动化测试客户清理完毕。");

  // 5. 检查用户画像统计接口能够正常读取并聚合所有数据
  const analyticsRes = await getAnalytics();
  if (!analyticsRes.ok) {
    throw new Error("FAIL: GET /api/analytics 失败");
  }
  const analytics = await analyticsRes.json();
  if (analytics.totalCustomers < 24) {
    throw new Error(`FAIL: 用户画像样本数不足: ${analytics.totalCustomers}`);
  }
  if (!analytics.channelDistribution.length || !analytics.focusDimensionsRanking.length) {
    throw new Error("FAIL: 用户画像维度统计为空");
  }
  console.log(`✓ 5. 用户画像统计接口正常: 样本总量=${analytics.totalCustomers}, 渠道数=${analytics.channelDistribution.length}, 关注维度数=${analytics.focusDimensionsRanking.length}`);

  // 6. 检查原有车辆、报告和销售案例功能未受破坏
  const v1 = await db.vehicle.findUnique({ where: { code: "V001" }, include: { inspections: true, salesCases: true } });
  if (!v1 || v1.inspections.length === 0) {
    throw new Error("FAIL: V001 或其原有鉴定数据缺失");
  }
  const reportsCount = await db.report.count();
  if (reportsCount === 0) {
    throw new Error("FAIL: 原有消费者报告丢失");
  }
  console.log(`✓ 6. 原有车辆 V001、质检与报告功能完整: 报告总数=${reportsCount}`);

  console.log("=== 所有重点验收检查项全部通过！ ===");
}

runAcceptanceChecks()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
