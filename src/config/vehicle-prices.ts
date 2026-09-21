// 真实新车指导价与当前二手车市场卖价（2026 年行情）
// newCarPrice: 当年款（或最后生产年款）厂商指导价，元
// marketLow/median/high: 当前二手车市场实际成交区间，元
// 车况调整区间由 API 层根据 median ±5%~8% 自动生成
export const VEHICLE_PRICE_MAP: Record<
  string,
  { newCarPrice: number; marketLow: number; marketMedian: number; marketHigh: number }
> = {
  // 2013 款起亚 K3 两条档案共用同一组市场参考价
  "001": { newCarPrice: 143800, marketLow: 15000, marketMedian: 17000, marketHigh: 19000 },
  "926": { newCarPrice: 143800, marketLow: 15000, marketMedian: 17000, marketHigh: 19000 },
  // 2019 款凯美瑞 2.5G，7 年 6.8 万公里
  "V001": { newCarPrice: 219800, marketLow: 12500, marketMedian: 13800, marketHigh: 15200 },
  // 2020 款途观L 330TSI，6 年 5.2 万公里
  "V002": { newCarPrice: 225800, marketLow: 13200, marketMedian: 14800, marketHigh: 16500 },
  // 2018 款雅阁 260TURBO，8 年 8.2 万公里
  "V003": { newCarPrice: 199800, marketLow: 12800, marketMedian: 14500, marketHigh: 16200 },
  // 2021 款卡罗拉 1.2T，5 年 4.9 万公里
  "V004": { newCarPrice: 127800, marketLow: 9800, marketMedian: 11500, marketHigh: 13200 },
  // 2022 款秦PLUS DM-i 55km，4 年 4.6 万公里
  "V005": { newCarPrice: 115800, marketLow: 10800, marketMedian: 12500, marketHigh: 14200 },
  // 2020 款 CS75 PLUS 1.5T，6 年 7.1 万公里
  "V006": { newCarPrice: 124900, marketLow: 10800, marketMedian: 12500, marketHigh: 14200 },
  // 2022 款 Model 3 后驱，4 年 3.2 万公里
  "V007": { newCarPrice: 279900, marketLow: 125000, marketMedian: 138000, marketHigh: 152000 },
  // 2021 款理想 ONE，停产车残值低，5 年 4.5 万公里
  "V008": { newCarPrice: 349800, marketLow: 95000, marketMedian: 105000, marketHigh: 118000 },
  // 2020 款宝马 325Li，6 年 4.8 万公里
  "V009": { newCarPrice: 346900, marketLow: 160000, marketMedian: 175000, marketHigh: 192000 },
  // 2021 款奔驰 C260L，5 年 3.9 万公里
  "V010": { newCarPrice: 346800, marketLow: 165000, marketMedian: 180000, marketHigh: 198000 },
  // 2022 款宋PLUS DM-i 110km，4 年 2.8 万公里
  "V011": { newCarPrice: 165800, marketLow: 65000, marketMedian: 72000, marketHigh: 82000 },
  // 2021 款 CR-V 240TURBO，5 年 5.2 万公里
  "V012": { newCarPrice: 207800, marketLow: 100000, marketMedian: 110000, marketHigh: 122000 },
  // 2020 款蔚来 ES6 性能版，6 年 4.1 万公里，新能源残值低
  "V013": { newCarPrice: 358000, marketLow: 85000, marketMedian: 98000, marketHigh: 112000 },
  // 2020 款 GL8 ES陆尊 653T，6 年 6 万公里
  "V014": { newCarPrice: 317900, marketLow: 135000, marketMedian: 148000, marketHigh: 162000 },
  // 2022 款星越L 2.0TD，4 年 3.1 万公里
  "V015": { newCarPrice: 165200, marketLow: 72000, marketMedian: 80000, marketHigh: 90000 },
  // 2022 款极氪 001 WE版，4 年 3.6 万公里
  "V016": { newCarPrice: 299400, marketLow: 125000, marketMedian: 140000, marketHigh: 158000 },
  // 2021 款汉兰达双擎四驱，5 年 4.3 万公里
  "V017": { newCarPrice: 325800, marketLow: 175000, marketMedian: 190000, marketHigh: 210000 },
  // 2022 款传祺 M8 领秀，4 年 3.8 万公里
  "V018": { newCarPrice: 264800, marketLow: 115000, marketMedian: 128000, marketHigh: 142000 },
  // 2021 款小鹏 P7，5 年 3.5 万公里
  "V019": { newCarPrice: 229900, marketLow: 65000, marketMedian: 75000, marketHigh: 88000 },
  // 2020 款沃尔沃 XC60 T5，6 年 5.1 万公里
  "V020": { newCarPrice: 430900, marketLow: 145000, marketMedian: 160000, marketHigh: 178000 },
  // 2021 款迈腾 330TSI，5 年 4.6 万公里
  "V021": { newCarPrice: 219900, marketLow: 95000, marketMedian: 105000, marketHigh: 118000 },
  // 2022 款坦克 300 征服者，4 年 2.9 万公里
  "V022": { newCarPrice: 213800, marketLow: 130000, marketMedian: 145000, marketHigh: 160000 },
  // 2023 款腾势 D9 DM-i，3 年 2.1 万公里
  "V023": { newCarPrice: 339800, marketLow: 205000, marketMedian: 225000, marketHigh: 245000 },
  // 2021 款宝马 530Li，5 年 4.2 万公里
  "V024": { newCarPrice: 465900, marketLow: 235000, marketMedian: 255000, marketHigh: 280000 },
  // 2023 款海鸥 420km，3 年 1.8 万公里
  "V025": { newCarPrice: 78800, marketLow: 45000, marketMedian: 50000, marketHigh: 56000 },
  // 2021 款奥迪 A4L 40TFSI，5 年 3.7 万公里
  "V026": { newCarPrice: 318800, marketLow: 145000, marketMedian: 160000, marketHigh: 178000 },
  // 2021 款奔驰 E300L，5 年 4.1 万公里
  "V027": { newCarPrice: 465800, marketLow: 255000, marketMedian: 275000, marketHigh: 300000 },
  // 2022 款奥迪 A6L 45TFSI quattro，4 年 3.6 万公里
  "V028": { newCarPrice: 499800, marketLow: 265000, marketMedian: 285000, marketHigh: 310000 },
  // 2022 款汉 EV 创世版，4 年 2.9 万公里
  "V029": { newCarPrice: 289800, marketLow: 105000, marketMedian: 120000, marketHigh: 138000 },
  // 2023 款秦PLUS 冠军版，3 年 2.2 万公里
  "V030": { newCarPrice: 125800, marketLow: 55000, marketMedian: 62000, marketHigh: 70000 },
  // 2024 款极氪 007 后驱智驾，2 年 1.2 万公里
  "V031": { newCarPrice: 229900, marketLow: 160000, marketMedian: 175000, marketHigh: 192000 },
  // 2022 款小鹏 P5 550E，4 年 3.8 万公里
  "V032": { newCarPrice: 177900, marketLow: 40000, marketMedian: 48000, marketHigh: 58000 },
  // 2023 款蔚来 ET5 75kWh，3 年 2.4 万公里
  "V033": { newCarPrice: 298000, marketLow: 95000, marketMedian: 110000, marketHigh: 128000 },
  // 2022 款领克 03+，4 年 3.5 万公里
  "V034": { newCarPrice: 198800, marketLow: 80000, marketMedian: 92000, marketHigh: 105000 },
  // 2021 款帕萨特 330TSI，5 年 5.2 万公里
  "V035": { newCarPrice: 215900, marketLow: 90000, marketMedian: 100000, marketHigh: 112000 },
  // 2022 款速腾 200TSI，4 年 3.1 万公里
  "V036": { newCarPrice: 158900, marketLow: 65000, marketMedian: 73000, marketHigh: 82000 },
  // 2022 款思域 240TURBO，4 年 3.3 万公里
  "V037": { newCarPrice: 142900, marketLow: 72000, marketMedian: 82000, marketHigh: 92000 },
  // 2022 款轩逸经典，4 年 4.2 万公里
  "V038": { newCarPrice: 118600, marketLow: 45000, marketMedian: 50000, marketHigh: 56000 },
  // 2021 款亚洲龙 2.5L，5 年 4.8 万公里
  "V039": { newCarPrice: 208800, marketLow: 105000, marketMedian: 118000, marketHigh: 132000 },
  // 2021 款凯迪拉克 CT5，5 年 3.9 万公里
  "V040": { newCarPrice: 279700, marketLow: 105000, marketMedian: 118000, marketHigh: 135000 },
  // 2021 款沃尔沃 S90 B5，5 年 4.6 万公里
  "V041": { newCarPrice: 406900, marketLow: 155000, marketMedian: 170000, marketHigh: 190000 },
  // 2023 款红旗 H5，3 年 2.3 万公里
  "V042": { newCarPrice: 179800, marketLow: 95000, marketMedian: 105000, marketHigh: 118000 },
  // 2022 款红旗 H9，4 年 3.6 万公里
  "V043": { newCarPrice: 309800, marketLow: 145000, marketMedian: 160000, marketHigh: 180000 },
  // 2020 款雷克萨斯 ES200，6 年 5.1 万公里
  "V044": { newCarPrice: 290000, marketLow: 155000, marketMedian: 170000, marketHigh: 190000 },
  // 2022 款现代伊兰特，4 年 3.5 万公里
  "V045": { newCarPrice: 104800, marketLow: 45000, marketMedian: 50000, marketHigh: 56000 },
  // 2021 款大众高尔夫 280TSI，5 年 3.8 万公里
  "V046": { newCarPrice: 151300, marketLow: 65000, marketMedian: 73000, marketHigh: 82000 },
  // 2024 款领克 07 EM-P，2 年 1.1 万公里
  "V047": { newCarPrice: 169800, marketLow: 120000, marketMedian: 132000, marketHigh: 145000 },
  // 2023 款宝马 i3，3 年 2.1 万公里
  "V048": { newCarPrice: 353900, marketLow: 145000, marketMedian: 160000, marketHigh: 180000 },
  // 2022 款 Model Y 后驱，4 年 3.4 万公里
  "V049": { newCarPrice: 316900, marketLow: 145000, marketMedian: 160000, marketHigh: 178000 },
  // 2023 款理想 L7 Pro，3 年 2.2 万公里
  "V050": { newCarPrice: 339800, marketLow: 205000, marketMedian: 225000, marketHigh: 248000 },
  // 2023 款理想 L8 Max，3 年 2.6 万公里
  "V051": { newCarPrice: 399800, marketLow: 255000, marketMedian: 275000, marketHigh: 300000 },
  // 2022 款理想 L9 Max，4 年 3.8 万公里
  "V052": { newCarPrice: 459800, marketLow: 255000, marketMedian: 280000, marketHigh: 310000 },
  // 2021 款蔚来 ES8 六座 100kWh，5 年 4.5 万公里
  "V053": { newCarPrice: 586000, marketLow: 145000, marketMedian: 165000, marketHigh: 188000 },
  // 2023 款小鹏 G6 长续航，3 年 1.9 万公里
  "V054": { newCarPrice: 229900, marketLow: 125000, marketMedian: 138000, marketHigh: 152000 },
  // 2022 款小鹏 G9 570 Plus，4 年 3.1 万公里
  "V055": { newCarPrice: 309900, marketLow: 115000, marketMedian: 130000, marketHigh: 148000 },
  // 2022 款问界 M5 四驱，4 年 3.5 万公里
  "V056": { newCarPrice: 279800, marketLow: 105000, marketMedian: 118000, marketHigh: 135000 },
  // 2023 款问界 M7 Plus 六座，3 年 1.8 万公里
  "V057": { newCarPrice: 279800, marketLow: 175000, marketMedian: 190000, marketHigh: 210000 },
  // 2021 款宝马 X3 28i，5 年 4.6 万公里
  "V058": { newCarPrice: 389800, marketLow: 175000, marketMedian: 190000, marketHigh: 212000 },
  // 2022 款宝马 X5 30Li，4 年 3.3 万公里
  "V059": { newCarPrice: 605000, marketLow: 405000, marketMedian: 435000, marketHigh: 465000 },
  // 2021 款奔驰 GLC260L，5 年 4.4 万公里
  "V060": { newCarPrice: 397800, marketLow: 185000, marketMedian: 200000, marketHigh: 220000 },
  // 2021 款奥迪 Q5L 40TFSI，5 年 4.8 万公里
  "V061": { newCarPrice: 427700, marketLow: 185000, marketMedian: 200000, marketHigh: 220000 },
  // 2021 款 RAV4 荣放，5 年 4.9 万公里
  "V062": { newCarPrice: 195800, marketLow: 105000, marketMedian: 115000, marketHigh: 128000 },
  // 2022 款丰田锋兰达，4 年 2.8 万公里
  "V063": { newCarPrice: 125800, marketLow: 65000, marketMedian: 73000, marketHigh: 82000 },
  // 2022 款唐 DM-i，4 年 3.6 万公里
  "V064": { newCarPrice: 229800, marketLow: 100000, marketMedian: 112000, marketHigh: 125000 },
  // 2022 款元PLUS 510km，4 年 2.7 万公里
  "V065": { newCarPrice: 157800, marketLow: 60000, marketMedian: 68000, marketHigh: 78000 },
  // 2022 款坦克 500 3.0T，4 年 3.2 万公里
  "V066": { newCarPrice: 335000, marketLow: 210000, marketMedian: 230000, marketHigh: 255000 },
  // 2023 款领克 08 EM-P，3 年 1.6 万公里
  "V067": { newCarPrice: 288000, marketLow: 145000, marketMedian: 160000, marketHigh: 180000 },
  // 2020 款保时捷 Macan 2.0T，6 年 4.7 万公里
  "V068": { newCarPrice: 545000, marketLow: 310000, marketMedian: 335000, marketHigh: 365000 },
  // 2021 款凯迪拉克 XT5，5 年 4.6 万公里
  "V069": { newCarPrice: 332700, marketLow: 105000, marketMedian: 120000, marketHigh: 138000 },
  // 2021 款捷豹 F-PACE，5 年 4.1 万公里
  "V070": { newCarPrice: 456800, marketLow: 145000, marketMedian: 165000, marketHigh: 188000 },
  // 2022 款传祺 GS8 双擎，4 年 3.4 万公里
  "V071": { newCarPrice: 269800, marketLow: 115000, marketMedian: 128000, marketHigh: 145000 },
  // 2022 款长安 CS55，4 年 3.3 万公里
  "V072": { newCarPrice: 113900, marketLow: 55000, marketMedian: 62000, marketHigh: 70000 },
  // 2023 款极氪 009 WE版，3 年 2.3 万公里
  "V073": { newCarPrice: 499000, marketLow: 280000, marketMedian: 305000, marketHigh: 335000 },
  // 2021 款丰田赛那混动，5 年 3.9 万公里
  "V074": { newCarPrice: 331800, marketLow: 185000, marketMedian: 200000, marketHigh: 220000 },
  // 2021 款本田奥德赛混动，5 年 4.3 万公里
  "V075": { newCarPrice: 299800, marketLow: 145000, marketMedian: 158000, marketHigh: 172000 },
  // 2022 款本田艾力绅混动，4 年 3.7 万公里
  "V076": { newCarPrice: 279800, marketLow: 145000, marketMedian: 158000, marketHigh: 172000 },
  // 2022 款岚图梦想家，4 年 3.1 万公里
  "V077": { newCarPrice: 369900, marketLow: 140000, marketMedian: 158000, marketHigh: 178000 },
  // 2022 款传祺 M6 PRO，4 年 3.8 万公里
  "V078": { newCarPrice: 145800, marketLow: 65000, marketMedian: 73000, marketHigh: 82000 },
  // 2023 款蔚来 ET5T，3 年 1.5 万公里
  "V079": { newCarPrice: 298000, marketLow: 115000, marketMedian: 130000, marketHigh: 148000 },
  // 2021 款福特 Mustang Mach-E，5 年 3.3 万公里
  "V080": { newCarPrice: 269900, marketLow: 75000, marketMedian: 85000, marketHigh: 98000 },
  // 2021 款奔驰 CLA200 猎跑，5 年 3.7 万公里
  "V081": { newCarPrice: 299800, marketLow: 125000, marketMedian: 140000, marketHigh: 160000 },
  // 2021 款奥迪 A4 allroad，5 年 4.2 万公里
  "V082": { newCarPrice: 428800, marketLow: 170000, marketMedian: 190000, marketHigh: 212000 },
  // 2021 款沃尔沃 V60 B5，5 年 3.9 万公里
  "V083": { newCarPrice: 395800, marketLow: 150000, marketMedian: 168000, marketHigh: 188000 },
  // 2021 款斯巴鲁傲虎，5 年 4.5 万公里
  "V084": { newCarPrice: 312800, marketLow: 120000, marketMedian: 135000, marketHigh: 152000 },
  // 2023 款极氪 X ME版四驱，3 年 1.6 万公里
  "V085": { newCarPrice: 205000, marketLow: 105000, marketMedian: 118000, marketHigh: 132000 },
};
