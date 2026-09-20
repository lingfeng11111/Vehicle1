import { describe, expect, it } from "vitest";
import {
  matchVehicleForDemand,
  type VehicleCandidate,
} from "./vehicle-matching";

const MOCK_VEHICLES: VehicleCandidate[] = [
  {
    id: "v-camry",
    code: "V001",
    brand: "丰田",
    model: "2019款 凯美瑞 2.5G",
    listingPrice: 145000,
    energyType: "ICE",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["B级家用标杆", "舒适型轿车"]),
  },
  {
    id: "v-tiguan",
    code: "V002",
    brand: "大众",
    model: "2020款 途观L 330TSI",
    listingPrice: 168000,
    energyType: "ICE",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["德系大五座SUV", "长途出行"]),
  },
  {
    id: "v-corolla",
    code: "V004",
    brand: "丰田",
    model: "2021款 卡罗拉 1.2T 精英版",
    listingPrice: 89800,
    energyType: "ICE",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["高保值省油代步", "紧凑型家用"]),
  },
  {
    id: "v-qin",
    code: "V005",
    brand: "比亚迪",
    model: "2022款 秦PLUS DM-i 55KM尊贵型",
    listingPrice: 76800,
    energyType: "NEW_ENERGY",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["插电超低油耗", "新能源通勤"]),
  },
  {
    id: "v-cs75",
    code: "V006",
    brand: "长安",
    model: "2020款 CS75 PLUS 1.5T 自动豪华型",
    listingPrice: 79800,
    energyType: "ICE",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["蓝鲸黄金动力SUV", "城市多功能SUV"]),
  },
  {
    id: "v-model3",
    code: "V007",
    brand: "特斯拉",
    model: "2022款 后轮驱动版",
    listingPrice: 182000,
    energyType: "NEW_ENERGY",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["新能源通勤", "智能辅助驾驶", "纯电长续航"]),
  },
  {
    id: "v-gl8",
    code: "V014",
    brand: "别克",
    model: "2020款 ES陆尊 653T 豪华型",
    listingPrice: 226000,
    energyType: "ICE",
    status: "AVAILABLE",
    displayTags: JSON.stringify(["商务头等舱MPV", "多人口全家出行", "大空间舒适"]),
  },
];

describe("Vehicle Matching Engine - Competition Signature Scripts", () => {
  it("throws clear error when vehicle garage is empty", () => {
    expect(() => matchVehicleForDemand([], {})).toThrow("当前车库暂无在售车辆，无法完成自动匹配");
  });

  it("Script A: 100% matches Buick GL8 when Business & MPV selected", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      usageScene: "高端商务接待",
      bodyType: "MPV",
      budgetMin: 210000,
      budgetMax: 240000,
      familySize: "经常满载",
      brandPreference: "不限品牌",
      focusTags: ["SPACE", "COMFORT"],
    });

    expect(result.vehicle.code).toBe("V014");
    expect(result.rule).toContain("商务接待与MPV剧本锁定");
  });

  it("Script B: 100% matches Tiguan L when Family + SUV + German + Safety/Space selected", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      usageScene: "家庭日常代步",
      bodyType: "SUV",
      brandPreference: "德系质感",
      budgetMin: 160000,
      budgetMax: 200000,
      familySize: "3-4 人",
      energyPreference: "燃油 / 混动",
      focusTags: ["SAFETY", "SPACE"],
    });

    expect(result.vehicle.code).toBe("V002");
    expect(result.rule).toContain("德系大五座SUV家庭安全剧本锁定");
  });

  it("Script C: 100% matches Tesla Model 3 when New Energy + Sedan + Charging Pole selected", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      usageScene: "城市上下班通勤",
      bodyType: "轿车",
      energyPreference: "新能源",
      chargingCondition: "有固定车位可装桩",
      budgetMin: 160000,
      budgetMax: 200000,
      focusTags: ["ENERGY"],
    });

    expect(result.vehicle.code).toBe("V007");
    expect(result.rule).toContain("新能源智能纯电轿车剧本锁定");
  });

  it("Script D: 100% matches Camry when Family + Japanese + Sedan + Safety/Value selected", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      usageScene: "家庭日常代步",
      bodyType: "轿车",
      brandPreference: "日系耐用",
      budgetMin: 120000,
      budgetMax: 160000,
      energyPreference: "燃油 / 混动",
      focusTags: ["SAFETY", "VALUE"],
    });

    expect(result.vehicle.code).toBe("V001");
    expect(result.rule).toContain("B级家庭舒适标杆轿车剧本锁定");
  });

  it("Script F: 100% matches Corolla when Novice + Budget <= 100000 selected", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      usageScene: "新手练车代步",
      bodyType: "轿车",
      budgetMin: 80000,
      budgetMax: 100000,
      brandPreference: "日系耐用",
      focusTags: ["PRICE"],
    });

    expect(result.vehicle.code).toBe("V004");
    expect(result.rule).toContain("经济省心新手代步剧本锁定");
  });

  it("General fallback: handles unconstrained or empty tags smoothly", () => {
    const result = matchVehicleForDemand(MOCK_VEHICLES, {
      budgetMin: 70000,
      budgetMax: 85000,
      usageScene: "日常代步",
      focusTags: [],
      energyPreference: "不限",
    });

    expect(result.vehicle).toBeDefined();
    expect(result.score).toBeGreaterThan(0);
  });
});
