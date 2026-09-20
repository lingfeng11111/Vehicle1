-- Store the extended buyer questionnaire without introducing a large relational model.
ALTER TABLE "CustomerDemand" ADD COLUMN "profileJson" TEXT NOT NULL DEFAULT '{}';
