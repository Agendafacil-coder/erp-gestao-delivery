export function food99ApiBase(override?: string | null): string {
  const fromConfig = override?.trim();
  if (fromConfig) return fromConfig.replace(/\/$/, "");

  const fromEnv =
    process.env.FOOD99_API_BASE?.trim() ||
    process.env.NINETY_NINE_FOOD_API_BASE?.trim() ||
    process.env["99FOOD_API_BASE"]?.trim();

  if (fromEnv) return fromEnv.replace(/\/$/, "");

  return "https://openapi-food.99app.com";
}
