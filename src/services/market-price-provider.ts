export type MarketPrice = {
  newCarReferencePrice: number;
  marketLow: number;
  marketMedian: number;
  marketHigh: number;
  conditionAdjustedLow: number;
  conditionAdjustedHigh: number;
  source: "MockMarketPriceProvider" | "ManualMarketPriceProvider";
  capturedAt: string;
};

export interface MarketPriceProvider {
  getSnapshot(vehicleCode: string, listingPrice: number): Promise<MarketPrice>;
}

export class MockMarketPriceProvider implements MarketPriceProvider {
  async getSnapshot(vehicleCode: string, listingPrice: number): Promise<MarketPrice> {
    const factor = vehicleCode === "V001" ? 1 : vehicleCode === "V002" ? 1.06 : 0.94;
    const marketMedian = Math.round(listingPrice * factor);
    return {
      newCarReferencePrice: vehicleCode === "V001" ? 179800 : vehicleCode === "V002" ? 219800 : 158800,
      marketLow: marketMedian - 13000,
      marketMedian,
      marketHigh: marketMedian + 14000,
      conditionAdjustedLow: marketMedian - 7000,
      conditionAdjustedHigh: marketMedian + 11000,
      source: "MockMarketPriceProvider",
      capturedAt: new Date().toISOString(),
    };
  }
}
