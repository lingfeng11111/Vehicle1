import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. 展示车源清单（涵盖轿车、SUV、MPV、跨界车、新能源车、燃油车，共 79 辆展车，加上基础库共 85 辆车）
const BASE_SHOWCASE_VEHICLES = [
  {
    id: "showcase-veh-01",
    code: "V007",
    vin: "VIN-SHOWCASE-0007",
    plateNo: "浙A·D32910",
    brand: "特斯拉",
    series: "Model 3",
    model: "2022款 后轮驱动版",
    modelYear: 2022,
    registrationDate: new Date("2022-06-15T00:00:00.000Z"),
    mileage: 32000,
    listingPrice: 182000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["新能源通勤", "智能辅助驾驶", "纯电长续航"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-02",
    code: "V008",
    vin: "VIN-SHOWCASE-0008",
    plateNo: "浙A·E88219",
    brand: "理想",
    series: "ONE",
    model: "2021款 增程6座版",
    modelYear: 2021,
    registrationDate: new Date("2021-11-20T00:00:00.000Z"),
    mileage: 45000,
    listingPrice: 168000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["家庭大六座SUV", "城市多功能SUV", "增程长续航"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-03",
    code: "V009",
    vin: "VIN-SHOWCASE-0009",
    plateNo: "浙A·728KA",
    brand: "宝马",
    series: "3系",
    model: "2020款 325Li M运动套装",
    modelYear: 2020,
    registrationDate: new Date("2020-09-10T00:00:00.000Z"),
    mileage: 48000,
    listingPrice: 218000,
    energyType: "ICE",
    displayTags: JSON.stringify(["德系豪华运动", "B级家用标杆", "高品质座舱"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-04",
    code: "V010",
    vin: "VIN-SHOWCASE-0010",
    plateNo: "浙A·366BW",
    brand: "奔驰",
    series: "C级",
    model: "2021款 C260L 运动版",
    modelYear: 2021,
    registrationDate: new Date("2021-04-18T00:00:00.000Z"),
    mileage: 39000,
    listingPrice: 235000,
    energyType: "ICE",
    displayTags: JSON.stringify(["德系豪华品质", "B级家用标杆", "高品质座舱"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-05",
    code: "V011",
    vin: "VIN-SHOWCASE-0011",
    plateNo: "浙A·F61988",
    brand: "比亚迪",
    series: "宋PLUS",
    model: "2022款 DM-i 110KM 旗舰PLUS",
    modelYear: 2022,
    registrationDate: new Date("2022-08-25T00:00:00.000Z"),
    mileage: 28000,
    listingPrice: 118000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["插电超低油耗", "家庭家用SUV", "高性价比"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-06",
    code: "V012",
    vin: "VIN-SHOWCASE-0012",
    plateNo: "浙A·998TY",
    brand: "本田",
    series: "CR-V",
    model: "2021款 240TURBO 两驱风尚版",
    modelYear: 2021,
    registrationDate: new Date("2021-05-12T00:00:00.000Z"),
    mileage: 52000,
    listingPrice: 138000,
    energyType: "ICE",
    displayTags: JSON.stringify(["城市多功能SUV", "高保值省油代步", "耐用省心"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-07",
    code: "V013",
    vin: "VIN-SHOWCASE-0013",
    plateNo: "浙A·D90123",
    brand: "蔚来",
    series: "ES6",
    model: "2020款 性能版 70kWh",
    modelYear: 2020,
    registrationDate: new Date("2020-10-30T00:00:00.000Z"),
    mileage: 41000,
    listingPrice: 175000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["智能纯电SUV", "豪华舒适", "德系大五座SUV"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-08",
    code: "V014",
    vin: "VIN-SHOWCASE-0014",
    plateNo: "浙A·518GL",
    brand: "别克",
    series: "GL8",
    model: "2020款 ES陆尊 653T 豪华型",
    modelYear: 2020,
    registrationDate: new Date("2020-12-08T00:00:00.000Z"),
    mileage: 60000,
    listingPrice: 226000,
    energyType: "ICE",
    displayTags: JSON.stringify(["商务头等舱MPV", "多人口全家出行", "大空间舒适"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-09",
    code: "V015",
    vin: "VIN-SHOWCASE-0015",
    plateNo: "浙A·812XY",
    brand: "吉利",
    series: "星越L",
    model: "2022款 2.0TD 高功自动两驱旗舰型",
    modelYear: 2022,
    registrationDate: new Date("2022-07-19T00:00:00.000Z"),
    mileage: 31000,
    listingPrice: 125000,
    energyType: "ICE",
    displayTags: JSON.stringify(["国产高品质SUV", "大空间舒适", "城市多功能SUV"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-10",
    code: "V016",
    vin: "VIN-SHOWCASE-0016",
    plateNo: "浙A·D77519",
    brand: "极氪",
    series: "001",
    model: "2022款 超长续航单电机 WE版",
    modelYear: 2022,
    registrationDate: new Date("2022-09-05T00:00:00.000Z"),
    mileage: 36000,
    listingPrice: 215000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["猎装轿跑跨界车", "新能源通勤", "大空间舒适"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-11",
    code: "V017",
    vin: "VIN-SHOWCASE-0017",
    plateNo: "浙A·H32911",
    brand: "丰田",
    series: "汉兰达",
    model: "2021款 2.5L 智能电混双擎 四驱尊贵版",
    modelYear: 2021,
    registrationDate: new Date("2021-09-18T00:00:00.000Z"),
    mileage: 43000,
    listingPrice: 208000,
    energyType: "ICE",
    displayTags: JSON.stringify(["大7座家用SUV", "高保值省油代步", "家庭日常代步"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-12",
    code: "V018",
    vin: "VIN-SHOWCASE-0018",
    plateNo: "浙A·M88920",
    brand: "广汽传祺",
    series: "M8",
    model: "2022款 领秀系列 390T 至尊版",
    modelYear: 2022,
    registrationDate: new Date("2022-04-12T00:00:00.000Z"),
    mileage: 38000,
    listingPrice: 179000,
    energyType: "ICE",
    displayTags: JSON.stringify(["豪华商务MPV", "多人口全家出行", "大空间舒适"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-13",
    code: "V019",
    vin: "VIN-SHOWCASE-0019",
    plateNo: "浙A·D82012",
    brand: "小鹏",
    series: "P7",
    model: "2021款 后驱长续航 智尊版",
    modelYear: 2021,
    registrationDate: new Date("2021-08-20T00:00:00.000Z"),
    mileage: 35000,
    listingPrice: 142000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["智能纯电轿跑", "纯电长续航", "智能辅助驾驶"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-14",
    code: "V020",
    vin: "VIN-SHOWCASE-0020",
    plateNo: "浙A·772VK",
    brand: "沃尔沃",
    series: "XC60",
    model: "2020款 T5 四驱智远运动版",
    modelYear: 2020,
    registrationDate: new Date("2020-07-15T00:00:00.000Z"),
    mileage: 51000,
    listingPrice: 198000,
    energyType: "ICE",
    displayTags: JSON.stringify(["安全健康中型SUV", "德系质感", "城市多功能SUV"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-15",
    code: "V021",
    vin: "VIN-SHOWCASE-0021",
    plateNo: "浙A·551MT",
    brand: "大众",
    series: "迈腾",
    model: "2021款 330TSI DSG 豪华型",
    modelYear: 2021,
    registrationDate: new Date("2021-03-22T00:00:00.000Z"),
    mileage: 46000,
    listingPrice: 155000,
    energyType: "ICE",
    displayTags: JSON.stringify(["德系品质B级车", "B级家用标杆", "城市上下班通勤"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-16",
    code: "V022",
    vin: "VIN-SHOWCASE-0022",
    plateNo: "浙A·300TK",
    brand: "坦克",
    series: "300",
    model: "2022款 越野版 2.0T 征服者",
    modelYear: 2022,
    registrationDate: new Date("2022-05-18T00:00:00.000Z"),
    mileage: 29000,
    listingPrice: 185000,
    energyType: "ICE",
    displayTags: JSON.stringify(["硬派越野SUV", "长途自驾远行", "大空间舒适"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-17",
    code: "V023",
    vin: "VIN-SHOWCASE-0023",
    plateNo: "浙A·D99812",
    brand: "腾势",
    series: "D9",
    model: "2023款 DM-i 970 尊贵型",
    modelYear: 2023,
    registrationDate: new Date("2023-03-10T00:00:00.000Z"),
    mileage: 21000,
    listingPrice: 298000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["高端新能源MPV", "商务头等舱MPV", "插电超低油耗"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-18",
    code: "V024",
    vin: "VIN-SHOWCASE-0024",
    plateNo: "浙A·530BM",
    brand: "宝马",
    series: "5系",
    model: "2021款 530Li 领先型 M运动套装",
    modelYear: 2021,
    registrationDate: new Date("2021-06-25T00:00:00.000Z"),
    mileage: 42000,
    listingPrice: 318000,
    energyType: "ICE",
    displayTags: JSON.stringify(["豪华行政座驾", "高端商务接待", "德系豪华品质"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-19",
    code: "V025",
    vin: "VIN-SHOWCASE-0025",
    plateNo: "浙A·D11299",
    brand: "比亚迪",
    series: "海豚",
    model: "2023款 420km 时尚版",
    modelYear: 2023,
    registrationDate: new Date("2023-05-14T00:00:00.000Z"),
    mileage: 18000,
    listingPrice: 88000,
    energyType: "NEW_ENERGY",
    displayTags: JSON.stringify(["纯电代步小车", "新能源通勤", "低油耗 / 低能耗"]),
    status: "AVAILABLE",
  },
  {
    id: "showcase-veh-20",
    code: "V026",
    vin: "VIN-SHOWCASE-0026",
    plateNo: "浙A·400AD",
    brand: "奥迪",
    series: "A4L",
    model: "2021款 40 TFSI 时尚动感型",
    modelYear: 2021,
    registrationDate: new Date("2021-08-08T00:00:00.000Z"),
    mileage: 37000,
    listingPrice: 188000,
    energyType: "ICE",
    displayTags: JSON.stringify(["豪华动感轿车", "德系豪华品质", "B级家用标杆"]),
    status: "AVAILABLE",
  },
];

const ADDITIONAL_VEHICLES_DEF = [
  // 轿车
  { code: "V027", brand: "奔驰", series: "E级", model: "2021款 E300L 时尚型", year: 2021, price: 348000, mileage: 41000, energy: "ICE", tags: ["德系行政座驾", "豪华商务", "保值标杆"], body: "轿车" },
  { code: "V028", brand: "奥迪", series: "A6L", model: "2022款 45 TFSI quattro 臻选动感型", year: 2022, price: 338000, mileage: 36000, energy: "ICE", tags: ["四驱豪华商务", "德系品质", "高端商务接待"], body: "轿车" },
  { code: "V029", brand: "比亚迪", series: "汉", model: "2022款 EV 创世版 715KM 旗舰型", year: 2022, price: 178000, mileage: 29000, energy: "NEW_ENERGY", tags: ["纯电长续航", "刀片电池", "国产新能源旗舰"], body: "轿车" },
  { code: "V030", brand: "比亚迪", series: "秦PLUS", model: "2023款 冠军版 DM-i 120KM 卓越型", year: 2023, price: 92000, mileage: 22000, energy: "NEW_ENERGY", tags: ["超低油耗代步", "插混家轿", "经济实用"], body: "轿车" },
  { code: "V031", brand: "极氪", series: "007", model: "2024款 后驱智驾版 100kWh", year: 2024, price: 219000, mileage: 12000, energy: "NEW_ENERGY", tags: ["800V高压超充", "高阶智驾", "纯电运动轿车"], body: "轿车" },
  { code: "V032", brand: "小鹏", series: "P5", model: "2022款 550E", year: 2022, price: 108000, mileage: 38000, energy: "NEW_ENERGY", tags: ["智能辅助驾驶", "家用大空间纯电", "高性价比代步"], body: "轿车" },
  { code: "V033", brand: "蔚来", series: "ET5", model: "2023款 75kWh", year: 2023, price: 208000, mileage: 24000, energy: "NEW_ENERGY", tags: ["智能纯电轿跑", "换电无忧", "四驱强劲动力"], body: "轿车" },
  { code: "V034", brand: "领克", series: "03", model: "2022款 03+ 2.0TD 自动性能套餐", year: 2022, price: 139000, mileage: 35000, energy: "ICE", tags: ["国产小钢炮", "运动操控", "排气声浪"], body: "轿车" },
  { code: "V035", brand: "大众", series: "帕萨特", model: "2021款 330TSI 精英版", year: 2021, price: 138000, mileage: 52000, energy: "ICE", tags: ["B级商务标杆", "德系品质", "空间宽敞"], body: "轿车" },
  { code: "V036", brand: "大众", series: "速腾", model: "2022款 200TSI DSG超越版", year: 2022, price: 98000, mileage: 31000, energy: "ICE", tags: ["德系家用车", "省油耐用", "保值代步"], body: "轿车" },
  { code: "V037", brand: "本田", series: "思域", model: "2022款 240TURBO CVT燃动版", year: 2022, price: 105000, mileage: 33000, energy: "ICE", tags: ["运动年轻轿车", "动力充沛", "改装潜力高"], body: "轿车" },
  { code: "V038", brand: "日产", series: "轩逸", model: "2022款 经典 1.6L 豪华版", year: 2022, price: 68000, mileage: 42000, energy: "ICE", tags: ["移动大沙发", "极低油耗", "省心耐用代步"], body: "轿车" },
  { code: "V039", brand: "丰田", series: "亚洲龙", model: "2021款 2.5L 进取版", year: 2021, price: 152000, mileage: 48000, energy: "ICE", tags: ["丰田TNGA旗舰", "B+级大空间", "保值舒适"], body: "轿车" },
  { code: "V040", brand: "凯迪拉克", series: "CT5", model: "2021款 28T 豪华型", year: 2021, price: 178000, mileage: 39000, energy: "ICE", tags: ["美系后驱运动", "2.0T高功率", "帅气颜值"], body: "轿车" },
  { code: "V041", brand: "沃尔沃", series: "S90", model: "2021款 B5 智逸豪华版", year: 2021, price: 218000, mileage: 46000, energy: "ICE", tags: ["北欧极简安全", "环保健康座舱", "行政大空间"], body: "轿车" },
  { code: "V042", brand: "红旗", series: "H5", model: "2023款 2.0T 自动智联旗享版", year: 2023, price: 125000, mileage: 23000, energy: "ICE", tags: ["国宾礼遇座驾", "国产B级标杆", "大气商务"], body: "轿车" },
  { code: "V043", brand: "红旗", series: "H9", model: "2022款 2.0T 智联旗畅版", year: 2022, price: 248000, mileage: 36000, energy: "ICE", tags: ["中式豪华旗舰", "气场强大", "高端商务"], body: "轿车" },
  { code: "V044", brand: "雷克萨斯", series: "ES", model: "2020款 ES200 卓越版", year: 2020, price: 212000, mileage: 51000, energy: "ICE", tags: ["进口纯正品质", "超高保值率", "极致静谧"], body: "轿车" },
  { code: "V045", brand: "现代", series: "伊兰特", model: "2022款 1.5L CVT精英版", year: 2022, price: 65000, mileage: 35000, energy: "ICE", tags: ["年轻前卫轿跑", "代步高性价比", "低使用成本"], body: "轿车" },
  { code: "V046", brand: "大众", series: "高尔夫", model: "2021款 280TSI DSG Pro", year: 2021, price: 109000, mileage: 38000, energy: "ICE", tags: ["两厢车标杆", "底盘紧凑扎实", "好开好停代步"], body: "轿车" },
  { code: "V047", brand: "领克", series: "07", model: "2024款 EM-P 126长续航 Pro", year: 2024, price: 156000, mileage: 11000, energy: "NEW_ENERGY", tags: ["插混超长综合续航", "原创都市美学", "无框车门"], body: "轿车" },
  { code: "V048", brand: "宝马", series: "i3", model: "2023款 eDrive 35 L", year: 2023, price: 176000, mileage: 21000, energy: "NEW_ENERGY", tags: ["豪华纯电轿跑", "后驱驾控乐趣", "空气悬架标配"], body: "轿车" },

  // SUV
  { code: "V049", brand: "特斯拉", series: "Model Y", model: "2022款 后轮驱动版", year: 2022, price: 216000, mileage: 34000, energy: "NEW_ENERGY", tags: ["纯电大空间SUV", "智能辅助驾驶", "保值率高"], body: "SUV" },
  { code: "V050", brand: "理想", series: "L7", model: "2023款 Pro", year: 2023, price: 248000, mileage: 22000, energy: "NEW_ENERGY", tags: ["家庭大五座SUV", "魔毯空气悬架", "增程无里程焦虑"], body: "SUV" },
  { code: "V051", brand: "理想", series: "L8", model: "2023款 Max", year: 2023, price: 278000, mileage: 26000, energy: "NEW_ENERGY", tags: ["家庭大六座SUV", "激光雷达高阶智驾", "多屏影音座舱"], body: "SUV" },
  { code: "V052", brand: "理想", series: "L9", model: "2022款 Max", year: 2022, price: 338000, mileage: 38000, energy: "NEW_ENERGY", tags: ["全尺寸旗舰SUV", "后排娱乐屏", "家庭头等舱"], body: "SUV" },
  { code: "V053", brand: "蔚来", series: "ES8", model: "2021款 六座版 100kWh", year: 2021, price: 268000, mileage: 45000, energy: "NEW_ENERGY", tags: ["全铝车身", "豪华六座纯电", "全场景换电"], body: "SUV" },
  { code: "V054", brand: "小鹏", series: "G6", model: "2023款 580长续航 Pro", year: 2023, price: 158000, mileage: 19000, energy: "NEW_ENERGY", tags: ["800V高压超充", "XNGP高阶智驾", "轿跑SUV"], body: "SUV" },
  { code: "V055", brand: "小鹏", series: "G9", model: "2022款 570 Plus", year: 2022, price: 198000, mileage: 31000, energy: "NEW_ENERGY", tags: ["中大型超充SUV", "音乐静谧座舱", "底盘滤震优秀"], body: "SUV" },
  { code: "V056", brand: "问界", series: "M5", model: "2022款 四驱性能版", year: 2022, price: 172000, mileage: 35000, energy: "NEW_ENERGY", tags: ["鸿蒙智能座舱", "增程四驱双电机", "操控灵动"], body: "SUV" },
  { code: "V057", brand: "问界", series: "M7", model: "2023款 Plus 六座后驱版", year: 2023, price: 228000, mileage: 18000, energy: "NEW_ENERGY", tags: ["大六座空间", "零重力座椅", "华为智能科技"], body: "SUV" },
  { code: "V058", brand: "宝马", series: "X3", model: "2021款 xDrive28i M运动套装", year: 2021, price: 256000, mileage: 46000, energy: "ICE", tags: ["德系豪华中型SUV", "全时四驱", "驾驶者之车"], body: "SUV" },
  { code: "V059", brand: "宝马", series: "X5", model: "2022款 xDrive30Li M运动套装", year: 2022, price: 478000, mileage: 33000, energy: "ICE", tags: ["公路SUV之王", "长轴后排奢享", "豪华气场"], body: "SUV" },
  { code: "V060", brand: "奔驰", series: "GLC", model: "2021款 GLC 260 L 4MATIC 动感型", year: 2021, price: 268000, mileage: 44000, energy: "ICE", tags: ["德系豪华品质", "大五座舒适", "保值率高"], body: "SUV" },
  { code: "V061", brand: "奥迪", series: "Q5L", model: "2021款 40 TFSI 豪华动感型", year: 2021, price: 238000, mileage: 48000, energy: "ICE", tags: ["quattro智能四驱", "德系严谨装配", "家用自驾首选"], body: "SUV" },
  { code: "V062", brand: "丰田", series: "RAV4荣放", model: "2021款 2.0L CVT两驱风尚版", year: 2021, price: 122000, mileage: 49000, energy: "ICE", tags: ["城市合资SUV", "故障率极低", "省心代步"], body: "SUV" },
  { code: "V063", brand: "丰田", series: "锋兰达", model: "2022款 2.0L CVT领先版", year: 2022, price: 89000, mileage: 28000, energy: "ICE", tags: ["经济紧凑SUV", "极高性价比", "养护省心"], body: "SUV" },
  { code: "V064", brand: "比亚迪", series: "唐", model: "2022款 唐DM-i 112KM 尊贵型", year: 2022, price: 156000, mileage: 36000, energy: "NEW_ENERGY", tags: ["大七座插混SUV", "超长续航", "家庭全家出行"], body: "SUV" },
  { code: "V065", brand: "比亚迪", series: "元PLUS", model: "2022款 510KM 旗舰型PLUS", year: 2022, price: 106000, mileage: 27000, energy: "NEW_ENERGY", tags: ["全球纯电潮跑", "底盘扎实", "通勤好开"], body: "SUV" },
  { code: "V066", brand: "坦克", series: "500", model: "2022款 3.0T 运动版 登峰5座", year: 2022, price: 278000, mileage: 32000, energy: "ICE", tags: ["V6双涡轮动力", "硬派越野商务", "非承载车身"], body: "SUV" },
  { code: "V067", brand: "领克", series: "08", model: "2023款 EM-P 220四驱性能Halo", year: 2023, price: 188000, mileage: 16000, energy: "NEW_ENERGY", tags: ["魅族FlymeAuto车机", "三电机插混四驱", "先锋设计"], body: "SUV" },
  { code: "V068", brand: "保时捷", series: "Macan", model: "2020款 Macan 2.0T", year: 2020, price: 388000, mileage: 47000, energy: "ICE", tags: ["斯图加特跑车血统", "极致做工", "豪华运动中型SUV"], body: "SUV" },
  { code: "V069", brand: "凯迪拉克", series: "XT5", model: "2021款 2.0T 两驱风尚型", year: 2021, price: 168000, mileage: 46000, energy: "ICE", tags: ["美系静音舒适", "大五座高安全", "真材实料"], body: "SUV" },
  { code: "V070", brand: "捷豹", series: "F-PACE", model: "2021款 2.0T 250PS 四驱版", year: 2021, price: 236000, mileage: 41000, energy: "ICE", tags: ["英伦绅士美学", "全铝车架架构", "小众格调"], body: "SUV" },
  { code: "V071", brand: "广汽传祺", series: "GS8", model: "2022款 双擎系列 2.0TM 四驱尊贵版", year: 2022, price: 162000, mileage: 34000, energy: "ICE", tags: ["大七座霸气外观", "丰田混动系统", "省油动力足"], body: "SUV" },
  { code: "V072", brand: "长安", series: "CS55", model: "2022款 第二代 1.5T 自动领航型", year: 2022, price: 76000, mileage: 33000, energy: "ICE", tags: ["国产精品SUV", "蓝鲸动力", "经济实惠"], body: "SUV" },

  // MPV
  { code: "V073", brand: "极氪", series: "009", model: "2023款 WE版 116kWh", year: 2023, price: 428000, mileage: 23000, energy: "NEW_ENERGY", tags: ["全铝车身纯电MPV", "空中陆地公务舱", "劳斯莱斯前脸"], body: "MPV" },
  { code: "V074", brand: "丰田", series: "赛那", model: "2021款 2.5L 混动 尊贵版", year: 2021, price: 278000, mileage: 39000, energy: "ICE", tags: ["家庭保姆车标杆", "油电混动超低能耗", "超大后备箱下潜"], body: "MPV" },
  { code: "V075", brand: "本田", series: "奥德赛", model: "2021款 锐·混动 2.0L 智享版", year: 2021, price: 189000, mileage: 43000, energy: "ICE", tags: ["超低地台老人小孩友好", "城市灵动MPV", "魔术座椅布局"], body: "MPV" },
  { code: "V076", brand: "本田", series: "艾力绅", model: "2022款 锐·混动 2.0L 经典版", year: 2022, price: 198000, mileage: 37000, energy: "ICE", tags: ["宜商宜家MPV", "混动省油安静", "独立航空座椅"], body: "MPV" },
  { code: "V077", brand: "岚图", series: "梦想家", model: "2022款 低碳版 想", year: 2022, price: 238000, mileage: 31000, energy: "NEW_ENERGY", tags: ["插混四驱大MPV", "空气悬架带魔毯", "底盘稳健高安全"], body: "MPV" },
  { code: "V078", brand: "广汽传祺", series: "M6", model: "2022款 PRO 270T 自动豪华版", year: 2022, price: 88000, mileage: 38000, energy: "ICE", tags: ["10万内高品质MPV", "三排大空间", "家用带娃神器"], body: "MPV" },

  // 跨界车 / 猎装 / 旅行车
  { code: "V079", brand: "蔚来", series: "ET5T", model: "2023款 75kWh", year: 2023, price: 228000, mileage: 15000, energy: "NEW_ENERGY", tags: ["智能纯电旅行车", "最美车尾线条", "露营装备装载"], body: "跨界车" },
  { code: "V080", brand: "福特", series: "Mustang Mach-E", model: "2021款 无马版 后驱豪华版", year: 2021, price: 148000, mileage: 33000, energy: "NEW_ENERGY", tags: ["纯电运动跨界SUV", "野马灵魂调校", "驾驶乐趣纯粹"], body: "跨界车" },
  { code: "V081", brand: "奔驰", series: "CLA", model: "2021款 CLA 200 猎跑车", year: 2021, price: 205000, mileage: 37000, energy: "ICE", tags: ["无框车门优雅猎装", "进口颜值天花板", "精致座舱"], body: "跨界车" },
  { code: "V082", brand: "奥迪", series: "A4 allroad", model: "2021款 quattro 探索家", year: 2021, price: 278000, mileage: 42000, energy: "ICE", tags: ["全地形全时四驱", "瓦罐车主信仰", "原装进口旅行车"], body: "跨界车" },
  { code: "V083", brand: "沃尔沃", series: "V60", model: "2021款 B5 智远豪华版", year: 2021, price: 228000, mileage: 39000, energy: "ICE", tags: ["北欧瓦罐美学", "骨科认证座椅", "安全与诗和远方"], body: "跨界车" },
  { code: "V084", brand: "斯巴鲁", series: "傲虎", model: "2021款 2.5i 运动版 EyeSight", year: 2021, price: 188000, mileage: 45000, energy: "ICE", tags: ["水平对置全时四驱", "硬派跨界旅行车", "极端路况脱困强"], body: "跨界车" },
  { code: "V085", brand: "极氪", series: "X", model: "2023款 ME版 四驱五座", year: 2023, price: 148000, mileage: 16000, energy: "NEW_ENERGY", tags: ["都市精致新奢跨界", "3.7秒破百", "无门把手纯电小钢炮"], body: "跨界车" },
];

const CITIES = ["A", "B", "C", "D", "E", "F"];

function buildAllShowcaseVehicles() {
  const list = [...BASE_SHOWCASE_VEHICLES];

  ADDITIONAL_VEHICLES_DEF.forEach((def, index) => {
    const num = index + 21;
    const codeNum = parseInt(def.code.replace("V", ""), 10);
    const id = `showcase-veh-${String(num).padStart(2, "0")}`;
    const vin = `VIN-SHOWCASE-${String(codeNum).padStart(4, "0")}`;
    const city = CITIES[index % CITIES.length];
    const plateNo = `浙${city}·${def.energy === "NEW_ENERGY" ? "D" : ""}${Math.floor(1000 + Math.random() * 9000)}`;

    let status = "AVAILABLE";
    if (index % 8 === 3) status = "SOLD";
    else if (index % 15 === 7) status = "RESERVED";

    list.push({
      id,
      code: def.code,
      vin,
      plateNo,
      brand: def.brand,
      series: def.series,
      model: def.model,
      modelYear: def.year,
      registrationDate: new Date(`${def.year}-0${(index % 9) + 1}-15T00:00:00.000Z`),
      mileage: def.mileage,
      listingPrice: def.price,
      energyType: def.energy,
      displayTags: JSON.stringify(def.tags),
      status,
    });
  });

  return list;
}

const ALL_SHOWCASE_VEHICLES = buildAllShowcaseVehicles();

// 2. 基础 24 位重点展示客户（固定 ID，保障现场指定演示案例与脚本一致）
const INITIAL_SHOWCASE_CUSTOMERS = [
  {
    id: "showcase-cust-01",
    name: "张建国",
    phone: "138****1101",
    sourceChannel: "抖音",
    sourceContent: "评论区咨询二手Model 3电池质保",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-01",
      budgetMin: 160000,
      budgetMax: 190000,
      usageScene: "城市上下班通勤",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["ENERGY", "RELIABILITY"],
      riskConcerns: ["电池衰减明显", "重大事故"],
      profile: {
        purchaseType: "增购",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 3 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["完整检测报告", "低油耗 / 能耗", "辅助驾驶"],
        avoidTags: ["重大事故", "电池衰减明显"],
        serviceNeeds: ["贷款方案", "交付保障"],
      },
      remark: "每日单程通勤 35 公里，关注电池衰减与高压系统工况。",
    },
    vehicleCode: "V007",
    salesCaseId: "SC-SHOWCASE-01",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-02",
    name: "孙雪梅",
    phone: "139****2202",
    sourceChannel: "小红书",
    sourceContent: "二胎家庭大六座SUV选车对比笔记",
    status: "CONVERTED",
    demand: {
      id: "showcase-dem-02",
      budgetMin: 150000,
      budgetMax: 180000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["SAFETY", "SPACE", "STRUCTURE"],
      riskConcerns: ["重大事故", "结构件修复"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "5 人以上",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 5 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "全款 / 贷款均可",
        energyPreference: "新能源",
        mustHave: ["大空间后排", "完整检测报告", "全景影像"],
        avoidTags: ["重大事故", "结构件修复", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "二胎家庭，周末常带老人出行，对第三排空间与安全性要求高。",
    },
    vehicleCode: "V008",
    salesCaseId: "SC-SHOWCASE-02",
    stage: "CONVERTED",
    result: "CONVERTED",
  },
  {
    id: "showcase-cust-03",
    name: "刘德华",
    phone: "137****3303",
    sourceChannel: "线下到店",
    sourceContent: "展厅直接到店看宝马3系",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-03",
      budgetMin: 200000,
      budgetMax: 230000,
      usageScene: "高端商务接待",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["APPEARANCE", "RELIABILITY", "VALUE"],
      riskConcerns: ["发动机渗漏", "调表翻新"],
      profile: {
        purchaseType: "置换",
        bodyType: "轿车",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "德系质感",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["一手车源", "完整检测报告", "原厂质保"],
        avoidTags: ["重大事故", "调表翻新", "高维修成本"],
        serviceNeeds: ["置换评估", "保险上牌协助"],
      },
      remark: "旧车大众帕萨特置换，要求无任何纵梁钣金与烧机油史。",
    },
    vehicleCode: "V009",
    salesCaseId: "SC-SHOWCASE-03",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-04",
    name: "吴海燕",
    phone: "136****4404",
    sourceChannel: "视频号",
    sourceContent: "直播间咨询十万出头家用插混SUV",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-04",
      budgetMin: 110000,
      budgetMax: 130000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["PRICE", "ENERGY", "MAINTENANCE"],
      riskConcerns: ["电池衰减明显", "后期维修成本"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "仅公共充电",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "完整检测报告"],
        avoidTags: ["营运车", "重大事故", "过户次数多"],
        serviceNeeds: ["贷款方案", "延保服务"],
      },
      remark: "刚成家首次购车，看重宋PLUS的使用成本与空间。",
    },
    vehicleCode: "V011",
    salesCaseId: "SC-SHOWCASE-04",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-05",
    name: "郑国强",
    phone: "135****5505",
    sourceChannel: "抖音",
    sourceContent: "短视频《省心耐用家用车》留言",
    status: "PENDING",
    demand: {
      id: "showcase-dem-05",
      budgetMin: 120000,
      budgetMax: 145000,
      usageScene: "家庭日常代步",
      purchaseTime: "1-3 个月内对比",
      focusTags: ["RELIABILITY", "VALUE", "MAINTENANCE"],
      riskConcerns: ["底盘异响", "结构件修复"],
      profile: {
        purchaseType: "置换",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1 万公里以内",
        vehicleAge: "近 5 年",
        chargingCondition: "不限",
        brandPreference: "日系耐用",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["完整检测报告", "一手车源"],
        avoidTags: ["重大事故", "泡水火烧", "调表翻新"],
        serviceNeeds: ["置换评估", "延保服务"],
      },
      remark: "计划换一台省心合资SUV，暂不急提，观望CR-V行情。",
    },
    vehicleCode: "V012",
    salesCaseId: "SC-SHOWCASE-05",
    stage: "PENDING",
    result: "PENDING",
  },
  {
    id: "showcase-cust-06",
    name: "林晓东",
    phone: "159****6606",
    sourceChannel: "小红书",
    sourceContent: "纯电豪华SUV选购私信",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-06",
      budgetMin: 160000,
      budgetMax: 185000,
      usageScene: "长途自驾远行",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["SAFETY", "SPACE", "RELIABILITY"],
      riskConcerns: ["底盘老化", "电池健康度"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 5 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "全款 / 贷款均可",
        energyPreference: "新能源",
        mustHave: ["完整检测报告", "大空间后排", "全景影像"],
        avoidTags: ["重大事故", "泡水火烧", "电池衰减明显"],
        serviceNeeds: ["交付保障", "延保服务"],
      },
      remark: "喜欢蔚来ES6的服务与舒适度，确认有无底盘与电池异常。",
    },
    vehicleCode: "V013",
    salesCaseId: "SC-SHOWCASE-06",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-07",
    name: "陈振华",
    phone: "188****7707",
    sourceChannel: "线下到店",
    sourceContent: "公司老板带司机到店看商务MPV",
    status: "CONVERTED",
    demand: {
      id: "showcase-dem-07",
      budgetMin: 210000,
      budgetMax: 240000,
      usageScene: "高端商务接待",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["SPACE", "APPEARANCE", "RELIABILITY"],
      riskConcerns: ["重大事故", "底盘老化"],
      profile: {
        purchaseType: "增购",
        bodyType: "MPV",
        familySize: "经常满载",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 5 年",
        chargingCondition: "不限",
        brandPreference: "不限品牌",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["大空间后排", "完整检测报告", "一手车源"],
        avoidTags: ["重大事故", "营运车", "调表翻新"],
        serviceNeeds: ["交付保障", "保险上牌协助"],
      },
      remark: "企业接待用车，要求必须为陆尊版本，内外成色保持良好。",
    },
    vehicleCode: "V014",
    salesCaseId: "SC-SHOWCASE-07",
    stage: "CONVERTED",
    result: "CONVERTED",
  },
  {
    id: "showcase-cust-08",
    name: "杨思远",
    phone: "187****8808",
    sourceChannel: "抖音",
    sourceContent: "短视频《猎装轿跑实测》引流线索",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-08",
      budgetMin: 200000,
      budgetMax: 230000,
      usageScene: "长途自驾远行",
      purchaseTime: "本月内选定交付",
      focusTags: ["APPEARANCE", "ENERGY", "SPACE"],
      riskConcerns: ["电池衰减明显", "结构件修复"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "跨界车",
        familySize: "1-2 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "辅助驾驶", "全景影像"],
        avoidTags: ["重大事故", "结构件修复"],
        serviceNeeds: ["贷款方案", "交付保障"],
      },
      remark: "喜欢极氪001的机械素质与后备箱装载能力，确认空悬状态。",
    },
    vehicleCode: "V016",
    salesCaseId: "SC-SHOWCASE-08",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-09",
    name: "方立新",
    phone: "133****9909",
    sourceChannel: "快手",
    sourceContent: "快手老铁看车直播留言",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-09",
      budgetMin: 115000,
      budgetMax: 135000,
      usageScene: "家庭日常代步",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["SPACE", "PRICE", "STRUCTURE"],
      riskConcerns: ["泡水火烧", "重大事故"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "国产高品质",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["大空间后排", "完整检测报告"],
        avoidTags: ["重大事故", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "星越L空间大底盘扎实，看重三大件工况与漆膜均匀度。",
    },
    vehicleCode: "V015",
    salesCaseId: "SC-SHOWCASE-09",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-10",
    name: "黄浩然",
    phone: "132****1010",
    sourceChannel: "小红书",
    sourceContent: "年轻职场女性选第一台车私信",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-10",
      budgetMin: 220000,
      budgetMax: 250000,
      usageScene: "城市上下班通勤",
      purchaseTime: "本月内选定交付",
      focusTags: ["APPEARANCE", "SAFETY", "VALUE"],
      riskConcerns: ["重大事故", "调表翻新"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "1 万公里以内",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "德系豪华",
        financePreference: "全款 / 贷款均可",
        energyPreference: "燃油 / 混动",
        mustHave: ["一手车源", "完整检测报告", "原厂质保"],
        avoidTags: ["重大事故", "调表翻新", "高维修成本"],
        serviceNeeds: ["保险上牌协助", "延保服务"],
      },
      remark: "首次购车看中奔驰C级外观与内饰豪华感，需要详尽检测说明。",
    },
    vehicleCode: "V010",
    salesCaseId: "SC-SHOWCASE-10",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-11",
    name: "谢宝林",
    phone: "131****2111",
    sourceChannel: "抖音",
    sourceContent: "直播间现场互动留资",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-11",
      budgetMin: 170000,
      budgetMax: 195000,
      usageScene: "城市上下班通勤",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["SAFETY", "ENERGY", "PRICE"],
      riskConcerns: ["电池衰减明显", "重大事故"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 3 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "全款",
        energyPreference: "新能源",
        mustHave: ["完整检测报告", "低油耗 / 能耗"],
        avoidTags: ["重大事故", "电池衰减明显"],
        serviceNeeds: ["交付保障", "保险上牌协助"],
      },
      remark: "关注三电健康度与底盘托底情况，有现成充电桩。",
    },
    vehicleCode: "V007",
    salesCaseId: "SC-SHOWCASE-11",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-12",
    name: "胡建民",
    phone: "158****3212",
    sourceChannel: "线下到店",
    sourceContent: "到店老客户转介绍带朋友看车",
    status: "CONVERTED",
    demand: {
      id: "showcase-dem-12",
      budgetMin: 110000,
      budgetMax: 125000,
      usageScene: "家庭日常代步",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["PRICE", "ENERGY", "STRUCTURE"],
      riskConcerns: ["重大事故", "泡水火烧"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "仅公共充电",
        brandPreference: "国产新能源",
        financePreference: "全款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "完整检测报告"],
        avoidTags: ["重大事故", "营运车", "泡水火烧"],
        serviceNeeds: ["交付保障", "保险上牌协助"],
      },
      remark: "朋友推荐来店，爽快客户，检测真实无大事故即刻交定金。",
    },
    vehicleCode: "V011",
    salesCaseId: "SC-SHOWCASE-12",
    stage: "CONVERTED",
    result: "CONVERTED",
  },
  {
    id: "showcase-cust-13",
    name: "沈秋华",
    phone: "137****4313",
    sourceChannel: "懂车帝",
    sourceContent: "懂车帝车型线索主动咨询",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-13",
      budgetMin: 130000,
      budgetMax: 150000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["RELIABILITY", "VALUE", "SAFETY"],
      riskConcerns: ["结构件修复", "底盘老化"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1 万公里以内",
        vehicleAge: "近 5 年",
        chargingCondition: "不限",
        brandPreference: "日系耐用",
        financePreference: "全款 / 贷款均可",
        energyPreference: "燃油 / 混动",
        mustHave: ["完整检测报告", "一手车源"],
        avoidTags: ["重大事故", "调表翻新"],
        serviceNeeds: ["交付保障", "置换评估"],
      },
      remark: "重视保值率与机械耐用度，要求无大事故与无调表。",
    },
    vehicleCode: "V012",
    salesCaseId: "SC-SHOWCASE-13",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-14",
    name: "马培源",
    phone: "136****5414",
    sourceChannel: "快手",
    sourceContent: "短视频《20万德系运动二手车》留言",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-14",
      budgetMin: 210000,
      budgetMax: 230000,
      usageScene: "长途自驾远行",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["APPEARANCE", "RELIABILITY", "SAFETY"],
      riskConcerns: ["发动机渗漏", "重大事故"],
      profile: {
        purchaseType: "增购",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "德系豪华",
        financePreference: "贷款",
        energyPreference: "燃油 / 混动",
        mustHave: ["原厂质保", "完整检测报告"],
        avoidTags: ["重大事故", "调表翻新"],
        serviceNeeds: ["贷款方案", "延保服务"],
      },
      remark: "年轻小伙自己买车，喜欢操控与动力，看重底盘紧绷度。",
    },
    vehicleCode: "V009",
    salesCaseId: "SC-SHOWCASE-14",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-15",
    name: "钱文俊",
    phone: "159****6515",
    sourceChannel: "抖音",
    sourceContent: "信息流广告表单预约试乘试驾",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-15",
      budgetMin: 160000,
      budgetMax: 180000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["SPACE", "SAFETY", "STRUCTURE"],
      riskConcerns: ["重大事故", "结构件修复"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "5 人以上",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 5 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "全款",
        energyPreference: "新能源",
        mustHave: ["大空间后排", "完整检测报告"],
        avoidTags: ["重大事故", "结构件修复", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "家有二孩带两名老人，需要六座SUV，理想ONE重点候选。",
    },
    vehicleCode: "V008",
    salesCaseId: "SC-SHOWCASE-15",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-16",
    name: "彭丽媛",
    phone: "186****7616",
    sourceChannel: "小红书",
    sourceContent: "主页私信咨询蔚来ES6二手质保与电池租用政策",
    status: "PENDING",
    demand: {
      id: "showcase-dem-16",
      budgetMin: 165000,
      budgetMax: 185000,
      usageScene: "城市上下班通勤",
      purchaseTime: "1-3 个月内对比",
      focusTags: ["ENERGY", "SAFETY", "PRICE"],
      riskConcerns: ["电池衰减明显", "后期维修成本"],
      profile: {
        purchaseType: "增购",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1 万公里以内",
        vehicleAge: "近 5 年",
        chargingCondition: "仅公共充电",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "完整检测报告"],
        avoidTags: ["重大事故", "电池衰减明显"],
        serviceNeeds: ["贷款方案", "延保服务"],
      },
      remark: "观望换电体系政策与续航达成率，不急提。",
    },
    vehicleCode: "V013",
    salesCaseId: "SC-SHOWCASE-16",
    stage: "PENDING",
    result: "PENDING",
  },
  {
    id: "showcase-cust-17",
    name: "宋伟峰",
    phone: "135****8717",
    sourceChannel: "线下到店",
    sourceContent: "老客户置换GL8陆尊",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-17",
      budgetMin: 215000,
      budgetMax: 235000,
      usageScene: "高端商务接待",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["SPACE", "RELIABILITY", "COMFORT"],
      riskConcerns: ["重大事故", "营运车"],
      profile: {
        purchaseType: "置换",
        bodyType: "MPV",
        familySize: "经常满载",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 5 年",
        chargingCondition: "不限",
        brandPreference: "美系豪华",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["大空间后排", "完整检测报告"],
        avoidTags: ["营运车", "重大事故"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "工厂接送客户，要求非营运车源，公里数真实。",
    },
    vehicleCode: "V014",
    salesCaseId: "SC-SHOWCASE-17",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-18",
    name: "蒋永强",
    phone: "138****9818",
    sourceChannel: "抖音",
    sourceContent: "短视频评论区询问吉利星越L油耗与动力",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-18",
      budgetMin: 120000,
      budgetMax: 130000,
      usageScene: "长途自驾远行",
      purchaseTime: "本月内选定交付",
      focusTags: ["POWER", "SPACE", "PRICE"],
      riskConcerns: ["底盘异响", "结构件修复"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "国产高品质",
        financePreference: "全款 / 贷款均可",
        energyPreference: "燃油 / 混动",
        mustHave: ["大空间后排", "完整检测报告"],
        avoidTags: ["重大事故", "调表翻新"],
        serviceNeeds: ["置换评估", "贷款方案"],
      },
      remark: "喜欢Drive-E高功发动机动力，要求底盘无托底变形。",
    },
    vehicleCode: "V015",
    salesCaseId: "SC-SHOWCASE-18",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-19",
    name: "罗海成",
    phone: "139****0919",
    sourceChannel: "视频号",
    sourceContent: "公众号推文留言咨询极氪001续航",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-19",
      budgetMin: 205000,
      budgetMax: 225000,
      usageScene: "长途自驾远行",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["ENERGY", "SPACE", "APPEARANCE"],
      riskConcerns: ["电池衰减明显", "重大事故"],
      profile: {
        purchaseType: "增购",
        bodyType: "跨界车",
        familySize: "3-4 人",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 3 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "完整检测报告"],
        avoidTags: ["重大事故", "电池衰减明显"],
        serviceNeeds: ["贷款方案", "交付保障"],
      },
      remark: "看重100度大电池长续航与掀背尾门，要求车身结构无损伤。",
    },
    vehicleCode: "V016",
    salesCaseId: "SC-SHOWCASE-19",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-20",
    name: "韩建明",
    phone: "137****1020",
    sourceChannel: "快手",
    sourceContent: "同城直播间咨询二手奔驰C级",
    status: "PENDING",
    demand: {
      id: "showcase-dem-20",
      budgetMin: 225000,
      budgetMax: 245000,
      usageScene: "高端商务接待",
      purchaseTime: "1-3 个月内对比",
      focusTags: ["APPEARANCE", "VALUE", "RELIABILITY"],
      riskConcerns: ["调表翻新", "高维修成本"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "1 万公里以内",
        vehicleAge: "近 3 年",
        chargingCondition: "不限",
        brandPreference: "德系豪华",
        financePreference: "贷款",
        energyPreference: "燃油 / 混动",
        mustHave: ["一手车源", "完整检测报告"],
        avoidTags: ["调表翻新", "重大事故"],
        serviceNeeds: ["贷款方案", "延保服务"],
      },
      remark: "自营小微企业商务使用，对比奔驰C级与宝马3系行情中。",
    },
    vehicleCode: "V010",
    salesCaseId: "SC-SHOWCASE-20",
    stage: "PENDING",
    result: "PENDING",
  },
  {
    id: "showcase-cust-21",
    name: "丁志刚",
    phone: "159****2121",
    sourceChannel: "抖音",
    sourceContent: "私信询问家用合资SUV本田CR-V",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-21",
      budgetMin: 130000,
      budgetMax: 145000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["RELIABILITY", "VALUE", "SAFETY"],
      riskConcerns: ["重大事故", "底盘异响"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 5 年",
        chargingCondition: "不限",
        brandPreference: "日系耐用",
        financePreference: "全款",
        energyPreference: "燃油 / 混动",
        mustHave: ["完整检测报告", "一手车源"],
        avoidTags: ["重大事故", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "注重三大件耐用省心，要求发动机变速箱无渗油拆修。",
    },
    vehicleCode: "V012",
    salesCaseId: "SC-SHOWCASE-21",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-22",
    name: "崔丽敏",
    phone: "188****3222",
    sourceChannel: "小红书",
    sourceContent: "笔记下方留言Model 3选装升级情况",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-22",
      budgetMin: 175000,
      budgetMax: 190000,
      usageScene: "城市上下班通勤",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["ENERGY", "APPEARANCE", "SAFETY"],
      riskConcerns: ["电池衰减明显", "重大事故"],
      profile: {
        purchaseType: "首次购车",
        bodyType: "轿车",
        familySize: "1-2 人",
        annualMileage: "2 万公里以上",
        vehicleAge: "近 3 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "国产新能源",
        financePreference: "全款",
        energyPreference: "新能源",
        mustHave: ["完整检测报告", "低油耗 / 能耗"],
        avoidTags: ["重大事故", "电池衰减明显"],
        serviceNeeds: ["交付保障", "保险上牌协助"],
      },
      remark: "单身女性代步，已具备车位桩，希望检测清晰、交车省心。",
    },
    vehicleCode: "V007",
    salesCaseId: "SC-SHOWCASE-22",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-23",
    name: "顾荣华",
    phone: "136****4323",
    sourceChannel: "线下到店",
    sourceContent: "展厅直接对比理想ONE与别克GL8",
    status: "COMMUNICATING",
    demand: {
      id: "showcase-dem-23",
      budgetMin: 165000,
      budgetMax: 220000,
      usageScene: "家庭日常代步",
      purchaseTime: "本月内选定交付",
      focusTags: ["SPACE", "SAFETY", "COMFORT"],
      riskConcerns: ["结构件修复", "重大事故"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "5 人以上",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 5 年",
        chargingCondition: "有固定车位可装桩",
        brandPreference: "不限品牌",
        financePreference: "全款 / 贷款均可",
        energyPreference: "不限",
        mustHave: ["大空间后排", "完整检测报告"],
        avoidTags: ["重大事故", "泡水火烧"],
        serviceNeeds: ["置换评估", "交付保障"],
      },
      remark: "家里5口人，需坐满舒适，倾向大SUV或MPV，看真实车况决定。",
    },
    vehicleCode: "V008",
    salesCaseId: "SC-SHOWCASE-23",
    stage: "INTERESTED",
    result: "IN_PROGRESS",
  },
  {
    id: "showcase-cust-24",
    name: "汤伟强",
    phone: "135****5424",
    sourceChannel: "懂车帝",
    sourceContent: "懂车帝置换评估专区留资",
    status: "REPORT_GENERATED",
    demand: {
      id: "showcase-dem-24",
      budgetMin: 110000,
      budgetMax: 125000,
      usageScene: "家庭日常代步",
      purchaseTime: "近期 1-2 周内急提",
      focusTags: ["ENERGY", "PRICE", "MAINTENANCE"],
      riskConcerns: ["后期维修成本", "重大事故"],
      profile: {
        purchaseType: "换购升级",
        bodyType: "SUV",
        familySize: "3-4 人",
        annualMileage: "1-2 万公里",
        vehicleAge: "近 3 年",
        chargingCondition: "仅公共充电",
        brandPreference: "国产新能源",
        financePreference: "贷款",
        energyPreference: "新能源",
        mustHave: ["低油耗 / 能耗", "完整检测报告"],
        avoidTags: ["营运车", "重大事故"],
        serviceNeeds: ["置换评估", "贷款方案"],
      },
      remark: "旧车现代朗动置换，看重宋PLUS DM-i市区纯电代步经济性。",
    },
    vehicleCode: "V011",
    salesCaseId: "SC-SHOWCASE-24",
    stage: "REPORT_GENERATED",
    result: "IN_PROGRESS",
  },
];

// 3. 扩充生成至 220 位真实客户样本（保障线索 > 200，全库成交转化率稳定在 70%~80% 之间）
const SURNAME_LIST = ["张", "王", "李", "赵", "陈", "刘", "杨", "黄", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "郑", "罗", "梁", "宋", "唐", "许", "韩", "冯", "邓", "曹", "彭", "曾", "肖", "田", "董", "潘", "袁", "蔡", "蒋", "余", "于", "杜", "叶", "程", "苏", "魏", "吕", "丁", "任", "沈", "姚"];
const GIVEN_LIST = ["伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军", "洋", "勇", "艳", "杰", "娟", "涛", "明", "超", "秀兰", "霞", "平", "刚", "桂英", "玉兰", "萍", "新", "建华", "文华", "志强", "海燕", "天宇", "浩然", "梓萱", "子涵", "宇轩", "浩宇", "欣怡", "雨涵", "思源", "博文"];
const CHANNELS = ["抖音", "小红书", "快手", "线下到店", "视频号", "懂车帝", "朋友推荐"];
const USAGE_SCENES = ["城市上下班通勤", "家庭日常代步", "长途自驾远行", "高端商务接待", "新手练手代步"];
const PURCHASE_TIMES = ["近期 1-2 周内急提", "本月内选定交付", "1-3 个月内对比", "暂未定看车缘"];
const PURCHASE_TYPES = ["首次购车", "换购升级", "增购", "置换"];

// 按照真实二手车市场合理分布车型：SUV 约 38%，轿车 约 38%，MPV 约 12%，跨界车 约 12%
const BODY_POOL = ["SUV", "轿车", "SUV", "轿车", "MPV", "跨界车", "SUV", "轿车"];
const FAMILY_SIZES = ["1-2 人", "3-4 人", "5 人以上", "经常满载"];
const ANNUAL_MILEAGES = ["1 万公里以内", "1-2 万公里", "2 万公里以上"];
const VEHICLE_AGES = ["近 1 年", "近 3 年", "近 5 年", "不限"];
const CHARGING_CONDS = ["有固定车位可装桩", "仅公共充电", "无充电条件", "不限"];
const BRAND_PREFS = ["国产新能源", "德系质感", "日系耐用", "美系豪华", "豪华品牌", "不限品牌"];
const FINANCE_PREFS = ["全款", "贷款", "全款 / 贷款均可"];
const ENERGY_PREFS = ["新能源", "燃油 / 混动", "新能源", "燃油 / 混动", "不限"];

// 规范聚焦标签：全部对齐 report-rules.ts 中支持的 code
const ALL_FOCUS_TAGS = [
  "SAFETY", "SPACE", "PRICE", "RELIABILITY", "ENERGY", "MAINTENANCE",
  "STRUCTURE", "APPEARANCE", "VALUE", "COMFORT", "POWER", "CONFIGURATION"
];

const ALL_MUST_HAVES = [
  "完整检测报告", "一手车源", "低油耗 / 能耗", "大空间后排",
  "全景影像", "辅助驾驶", "原厂质保", "可异地交付"
];

const ALL_AVOIDS = [
  "重大事故", "泡水火烧", "调表翻新", "结构件修复",
  "电池衰减明显", "营运车", "高维修成本", "过户次数多"
];

const ALL_SERVICE_NEEDS = [
  "置换评估", "贷款方案", "交付保障", "延保服务", "保险上牌协助", "异地看车"
];

function generateShowcaseCustomers() {
  const list = [...INITIAL_SHOWCASE_CUSTOMERS];

  // 目标总数 220。在原有 7 条基准客户（1 条 CONVERTED）前提下，本批需有 168 条 CONVERTED，使全库成交率 = 169 / 227 = 74.45%（严控 70%~80% 之间）
  // 前 24 条中已有 3 条 CONVERTED，后 196 条（25 ~ 220）中精准分配 165 条 CONVERTED，剩余 31 条分配至其他状态
  const targetTotal = 220;
  const neededConverted = 165;
  let allocatedConverted = 0;

  for (let i = 25; i <= targetTotal; i++) {
    const custId = `showcase-cust-${i}`;
    const demId = `showcase-dem-${i}`;
    const scId = `SC-SHOWCASE-${i}`;

    const surname = SURNAME_LIST[i % SURNAME_LIST.length];
    const given = GIVEN_LIST[(i * 3 + 7) % GIVEN_LIST.length];
    const name = surname + given;
    const phone = `138****${String(1000 + i).slice(-4)}`;
    const sourceChannel = CHANNELS[i % CHANNELS.length];
    const sourceContent = `客户通过 ${sourceChannel} 咨询二手车车况与意向车型问卷`;

    // 状态分配：前 165 个新生成的客户设定为 CONVERTED，剩下的 31 个分配给其他跟进阶段
    let status: string;
    let stage: string;
    let result: string;

    if (allocatedConverted < neededConverted) {
      status = "CONVERTED";
      stage = "CONVERTED";
      result = "CONVERTED";
      allocatedConverted++;
    } else {
      const remainderIdx = i % 5;
      if (remainderIdx === 0) {
        status = "COMMUNICATING";
        stage = "COMMUNICATING";
        result = "IN_PROGRESS";
      } else if (remainderIdx === 1) {
        status = "REPORT_GENERATED";
        stage = "REPORT_GENERATED";
        result = "IN_PROGRESS";
      } else if (remainderIdx === 2) {
        status = "INTERESTED";
        stage = "INTERESTED";
        result = "IN_PROGRESS";
      } else if (remainderIdx === 3) {
        status = "PENDING";
        stage = "PENDING";
        result = "PENDING";
      } else {
        status = "NEW";
        stage = "NEW";
        result = "IN_PROGRESS";
      }
    }

    // 预算与特征
    const budgetTier = i % 5;
    let bMin = 70000;
    let bMax = 110000;
    if (budgetTier === 1) { bMin = 100000; bMax = 140000; }
    else if (budgetTier === 2) { bMin = 130000; bMax = 170000; }
    else if (budgetTier === 3) { bMin = 160000; bMax = 220000; }
    else if (budgetTier === 4) { bMin = 210000; bMax = 320000; }

    const usageScene = USAGE_SCENES[(i + 1) % USAGE_SCENES.length];
    const purchaseTime = PURCHASE_TIMES[(i + 2) % PURCHASE_TIMES.length];
    const purchaseType = PURCHASE_TYPES[(i + 3) % PURCHASE_TYPES.length];
    const bodyType = BODY_POOL[i % BODY_POOL.length];
    const familySize = FAMILY_SIZES[(i + 4) % FAMILY_SIZES.length];
    const annualMileage = ANNUAL_MILEAGES[(i + 1) % ANNUAL_MILEAGES.length];
    const vehicleAge = VEHICLE_AGES[(i * 3) % VEHICLE_AGES.length];
    const chargingCondition = CHARGING_CONDS[(i + 2) % CHARGING_CONDS.length];
    const brandPreference = BRAND_PREFS[(i + 5) % BRAND_PREFS.length];
    const financePreference = FINANCE_PREFS[(i + 3) % FINANCE_PREFS.length];
    const energyPreference = ENERGY_PREFS[(i + 1) % ENERGY_PREFS.length];

    // 标签抽取
    const tag1 = ALL_FOCUS_TAGS[i % ALL_FOCUS_TAGS.length];
    const tag2 = ALL_FOCUS_TAGS[(i + 4) % ALL_FOCUS_TAGS.length];
    const focusTags = [tag1, tag2];

    const mustHave = [
      ALL_MUST_HAVES[i % ALL_MUST_HAVES.length],
      ALL_MUST_HAVES[(i + 3) % ALL_MUST_HAVES.length],
    ];
    // 每个客户分配 2~3 个明确避雷项
    const avoidTags = [
      ALL_AVOIDS[i % ALL_AVOIDS.length],
      ALL_AVOIDS[(i + 3) % ALL_AVOIDS.length],
      ALL_AVOIDS[(i + 5) % ALL_AVOIDS.length],
    ];
    // 每个客户分配 2 个顾问协助事项
    const serviceNeeds = [
      ALL_SERVICE_NEEDS[i % ALL_SERVICE_NEEDS.length],
      ALL_SERVICE_NEEDS[(i + 2) % ALL_SERVICE_NEEDS.length],
    ];

    // 匹配车辆代码（从 V001 到 V085 分配）
    let vehicleCode = `V${String((i % 85) + 1).padStart(3, "0")}`;
    if (bodyType === "MPV") {
      const mpvCodes = ["V014", "V018", "V023", "V073", "V074", "V075", "V076", "V077", "V078"];
      vehicleCode = mpvCodes[i % mpvCodes.length];
    } else if (bodyType === "跨界车") {
      const crossCodes = ["V016", "V079", "V080", "V081", "V082", "V083", "V084", "V085"];
      vehicleCode = crossCodes[i % crossCodes.length];
    } else if (bodyType === "轿车") {
      const sedanCodes = ["V001", "V003", "V004", "V005", "V007", "V009", "V010", "V019", "V021", "V024", "V025", "V026", "V027", "V028", "V029", "V030"];
      vehicleCode = sedanCodes[i % sedanCodes.length];
    }

    list.push({
      id: custId,
      name,
      phone,
      sourceChannel,
      sourceContent,
      status,
      demand: {
        id: demId,
        budgetMin: bMin,
        budgetMax: bMax,
        usageScene,
        purchaseTime,
        focusTags,
        riskConcerns: avoidTags,
        profile: {
          purchaseType,
          bodyType,
          familySize,
          annualMileage,
          vehicleAge,
          chargingCondition,
          brandPreference,
          financePreference,
          energyPreference,
          mustHave,
          avoidTags,
          serviceNeeds,
        },
        remark: `客户期望在预算 ${bMin / 10000}-${bMax / 10000}万内选购，重点关注${tag1}与${tag2}。`,
      },
      vehicleCode,
      salesCaseId: scId,
      stage,
      result,
    });
  }

  return list;
}

const SHOWCASE_CUSTOMERS = generateShowcaseCustomers();

async function seedShowcase() {
  console.log("=== 开始幂等录入展示车源与客户画像线索数据集 ===");

  // 1. 幂等写入展示车源（共 79 辆展车，V007 ~ V085，加上基础 6 辆车达到 85 辆全量规模）
  let vehicleCount = 0;
  for (const v of ALL_SHOWCASE_VEHICLES) {
    await prisma.vehicle.upsert({
      where: { code: v.code },
      create: {
        id: v.id,
        code: v.code,
        vin: v.vin,
        plateNo: v.plateNo,
        brand: v.brand,
        series: v.series,
        model: v.model,
        modelYear: v.modelYear,
        registrationDate: v.registrationDate,
        mileage: v.mileage,
        listingPrice: v.listingPrice,
        energyType: v.energyType,
        displayTags: v.displayTags,
        status: v.status,
      },
      update: {
        code: v.code,
        vin: v.vin,
        plateNo: v.plateNo,
        brand: v.brand,
        series: v.series,
        model: v.model,
        modelYear: v.modelYear,
        registrationDate: v.registrationDate,
        mileage: v.mileage,
        listingPrice: v.listingPrice,
        energyType: v.energyType,
        displayTags: v.displayTags,
        status: v.status,
      },
    });
    vehicleCount++;
  }
  console.log(`✓ Upserted ${vehicleCount} showcase vehicles (V007 ~ V085). Total vehicles in garage: ${vehicleCount + 6}.`);

  // 2. 补全基础 6 位历史客户的 profileJson 字段，确保画像数据 100% 完整无空缺
  const baseCustomers = await prisma.customer.findMany({
    where: { id: { not: { startsWith: "showcase-cust-" } } },
    include: { demands: true },
  });

  for (const baseCust of baseCustomers) {
    const dem = baseCust.demands[0];
    if (dem) {
      let existingProfile: Record<string, unknown> = {};
      try {
        if (dem.profileJson) existingProfile = JSON.parse(dem.profileJson);
      } catch {}

      const mergedProfile = {
        purchaseType: existingProfile.purchaseType || "首次购车",
        bodyType: existingProfile.bodyType || "轿车",
        familySize: existingProfile.familySize || "3-4 人",
        annualMileage: existingProfile.annualMileage || "1-2 万公里",
        vehicleAge: existingProfile.vehicleAge || "近 3 年",
        chargingCondition: existingProfile.chargingCondition || "不限",
        brandPreference: existingProfile.brandPreference || "德系质感",
        financePreference: existingProfile.financePreference || "全款",
        energyPreference: existingProfile.energyPreference || "燃油 / 混动",
        mustHave: existingProfile.mustHave || ["完整检测报告", "一手车源"],
        avoidTags: existingProfile.avoidTags || ["重大事故", "泡水火烧", "调表翻新"],
        serviceNeeds: existingProfile.serviceNeeds || ["置换评估", "交付保障"],
      };

      await prisma.customerDemand.update({
        where: { id: dem.id },
        data: {
          profileJson: JSON.stringify(mergedProfile),
          riskConcerns: JSON.stringify(mergedProfile.avoidTags),
        },
      });
    }
  }
  console.log(`✓ Synchronized full profileJson for ${baseCustomers.length} baseline customers.`);

  // 3. 幂等写入 220 条客户需求问卷与销售跟进
  let customerCount = 0;
  for (const item of SHOWCASE_CUSTOMERS) {
    const customer = await prisma.customer.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        phone: item.phone,
        sourceChannel: item.sourceChannel,
        sourceContent: item.sourceContent,
        status: item.status,
      },
      update: {
        name: item.name,
        phone: item.phone,
        sourceChannel: item.sourceChannel,
        sourceContent: item.sourceContent,
        status: item.status,
      },
    });

    const demand = await prisma.customerDemand.upsert({
      where: { id: item.demand.id },
      create: {
        id: item.demand.id,
        customerId: customer.id,
        budgetMin: item.demand.budgetMin,
        budgetMax: item.demand.budgetMax,
        usageScene: item.demand.usageScene,
        purchaseTime: item.demand.purchaseTime,
        focusTags: JSON.stringify(item.demand.focusTags),
        riskConcerns: JSON.stringify(item.demand.riskConcerns),
        profileJson: JSON.stringify(item.demand.profile),
        remark: item.demand.remark,
      },
      update: {
        customerId: customer.id,
        budgetMin: item.demand.budgetMin,
        budgetMax: item.demand.budgetMax,
        usageScene: item.demand.usageScene,
        purchaseTime: item.demand.purchaseTime,
        focusTags: JSON.stringify(item.demand.focusTags),
        riskConcerns: JSON.stringify(item.demand.riskConcerns),
        profileJson: JSON.stringify(item.demand.profile),
        remark: item.demand.remark,
      },
    });

    // 查找目标车辆绑定 SalesCase
    const vehicle = await prisma.vehicle.findUnique({
      where: { code: item.vehicleCode },
    });

    if (vehicle) {
      await prisma.salesCase.upsert({
        where: { id: item.salesCaseId },
        create: {
          id: item.salesCaseId,
          customerId: customer.id,
          demandId: demand.id,
          vehicleId: vehicle.id,
          sourceChannel: customer.sourceChannel,
          stage: item.stage,
          result: item.result,
        },
        update: {
          customerId: customer.id,
          demandId: demand.id,
          vehicleId: vehicle.id,
          sourceChannel: customer.sourceChannel,
          stage: item.stage,
          result: item.result,
        },
      });

      // 幂等记录跟进事件
      const eventId = `event-${item.salesCaseId}-01`;
      await prisma.salesEvent.upsert({
        where: { id: eventId },
        create: {
          id: eventId,
          salesCaseId: item.salesCaseId,
          eventType: "VEHICLE_AUTO_MATCHED",
          metadata: JSON.stringify({
            vehicleCode: vehicle.code,
            model: vehicle.model,
            note: "根据客户问卷与偏好自动匹配",
          }),
        },
        update: {
          metadata: JSON.stringify({
            vehicleCode: vehicle.code,
            model: vehicle.model,
            note: "根据客户问卷与偏好自动匹配",
          }),
        },
      });
    }

    customerCount++;
  }
  console.log(`✓ Upserted ${customerCount} showcase customers with demand questionnaires and sales follow-ups.`);
  console.log("Showcase seeding completed successfully.");
}

seedShowcase()
  .catch((e) => {
    console.error("Error during showcase seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
