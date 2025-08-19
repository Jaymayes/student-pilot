import { db } from "../server/db";
import { rateCard } from "@shared/schema";

// OpenAI pricing per 1K tokens (as of August 2024) with 4x markup for ScholarLink
const OPENAI_RATES_WITH_MARKUP = [
  // GPT-4o (newest model - recommended)
  {
    model: "gpt-4o",
    inputCreditsPer1k: "0.0100", // $0.0025 * 4 = $0.01 per 1K input tokens  
    outputCreditsPer1k: "0.0400", // $0.01 * 4 = $0.04 per 1K output tokens
  },
  // GPT-4o-mini (most cost-effective)
  {
    model: "gpt-4o-mini", 
    inputCreditsPer1k: "0.0006", // $0.00015 * 4 = $0.0006 per 1K input tokens
    outputCreditsPer1k: "0.0024", // $0.0006 * 4 = $0.0024 per 1K output tokens
  },
  // GPT-4 Turbo (legacy)
  {
    model: "gpt-4-1106-preview",
    inputCreditsPer1k: "0.0400", // $0.01 * 4 = $0.04 per 1K input tokens
    outputCreditsPer1k: "0.1200", // $0.03 * 4 = $0.12 per 1K output tokens
  },
  {
    model: "gpt-4-1106-vision-preview",
    inputCreditsPer1k: "0.0400", // $0.01 * 4 = $0.04 per 1K input tokens
    outputCreditsPer1k: "0.1200", // $0.03 * 4 = $0.12 per 1K output tokens
  },
  // GPT-3.5 Turbo (legacy)
  {
    model: "gpt-3.5-turbo-1106",
    inputCreditsPer1k: "0.0040", // $0.001 * 4 = $0.004 per 1K input tokens
    outputCreditsPer1k: "0.0080", // $0.002 * 4 = $0.008 per 1K output tokens
  },
];

async function seedRateCard() {
  console.log("🌱 Seeding rate card with OpenAI pricing (4x markup)...");

  try {
    // First, deactivate all existing rates
    await db
      .update(rateCard)
      .set({ active: false });

    console.log("✅ Deactivated existing rate entries");

    // Insert new rates
    const insertedRates = await db
      .insert(rateCard)
      .values(
        OPENAI_RATES_WITH_MARKUP.map(rate => ({
          model: rate.model,
          inputCreditsPer1k: rate.inputCreditsPer1k,
          outputCreditsPer1k: rate.outputCreditsPer1k,
          active: true,
        }))
      )
      .returning();

    console.log(`✅ Inserted ${insertedRates.length} new rate card entries:`);
    
    insertedRates.forEach(rate => {
      const inputCostUsd = Number(rate.inputCreditsPer1k);
      const outputCostUsd = Number(rate.outputCreditsPer1k);
      
      console.log(`  📊 ${rate.model}:`);
      console.log(`     Input: $${inputCostUsd.toFixed(4)} (${(inputCostUsd * 1000).toFixed(2)} credits) per 1K tokens`);
      console.log(`     Output: $${outputCostUsd.toFixed(4)} (${(outputCostUsd * 1000).toFixed(2)} credits) per 1K tokens`);
    });

    // Show example cost calculation for a typical essay analysis
    console.log(`\n💡 Example cost for typical essay analysis (1000 input + 500 output tokens):`);
    console.log(`   🤖 gpt-4o: $${((0.0100 * 1) + (0.0400 * 0.5)).toFixed(4)} = ${((10 * 1) + (40 * 0.5)).toFixed(0)} credits`);
    console.log(`   ⚡ gpt-4o-mini: $${((0.0006 * 1) + (0.0024 * 0.5)).toFixed(4)} = ${((0.6 * 1) + (2.4 * 0.5)).toFixed(1)} credits`);
    
    console.log(`\n🎯 Rate card seeding complete!`);
    
  } catch (error) {
    console.error("❌ Error seeding rate card:", error);
    throw error;
  }
}

// Auto-run when script is executed
seedRateCard()
  .then(() => {
    console.log("🚀 Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seeding failed:", error);
    process.exit(1);
  });

export { seedRateCard };