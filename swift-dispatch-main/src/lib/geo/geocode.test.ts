import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { buildNavigationAddress } from "./addressNavigation";
import { geocodeAddress, resolveOrderCoordinates } from "./geocode";

describe("resolveOrderCoordinates", () => {
  it("monta endereço de navegação com cidade da loja", async () => {
    const fetchMock = mock.fn(async () =>
      Response.json({
        features: [{ center: [-46.6333, -23.5505] }],
      }),
    );
    mock.method(globalThis, "fetch", fetchMock);

    const prev = process.env.VITE_MAPBOX_TOKEN;
    process.env.VITE_MAPBOX_TOKEN = "pk.test_token_1234567890";

    try {
      const result = await resolveOrderCoordinates({
        address: "Rua Augusta, 100",
        neighborhood: "Consolação",
        postalCode: "01305000",
        cityRegion: "São Paulo, SP, Brasil",
        storeProximity: { lat: -23.55, lng: -46.63 },
      });

      assert.ok(result.navigationAddress.includes("Consolação"));
      assert.equal(result.lat, -23.5505);
      assert.equal(result.lng, -46.6333);
    } finally {
      process.env.VITE_MAPBOX_TOKEN = prev;
      mock.restoreAll();
    }
  });

  it("retorna null quando geocoder falha", async () => {
    mock.method(globalThis, "fetch", async () => new Response("error", { status: 500 }));

    const prev = process.env.VITE_MAPBOX_TOKEN;
    process.env.VITE_MAPBOX_TOKEN = "pk.test_token_1234567890";

    try {
      const result = await resolveOrderCoordinates({
        address: "Endereço inválido xyz",
        city: "Aguaí",
        state: "SP",
      });
      assert.equal(result.lat, null);
      assert.equal(result.lng, null);
    } finally {
      process.env.VITE_MAPBOX_TOKEN = prev;
      mock.restoreAll();
    }
  });
});

describe("buildNavigationAddress", () => {
  it("inclui bairro e CEP quando ausentes no endereço", () => {
    const full = buildNavigationAddress({
      address: "Rua das Flores, 10",
      neighborhood: "Centro",
      postalCode: "13860000",
      cityRegion: "Aguaí, SP, Brasil",
    });
    assert.match(full, /Centro/);
    assert.match(full, /13860-000/);
  });
});

describe("geocodeAddress", () => {
  it("usa Nominatim quando Mapbox não está configurado", async () => {
    const fetchMock = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("nominatim.openstreetmap.org")) {
        return Response.json([{ lat: "-22.9068", lon: "-43.1729" }]);
      }
      return new Response("skip", { status: 404 });
    });
    mock.method(globalThis, "fetch", fetchMock);

    const prevMapbox = process.env.VITE_MAPBOX_TOKEN;
    const prevMapbox2 = process.env.MAPBOX_ACCESS_TOKEN;
    delete process.env.VITE_MAPBOX_TOKEN;
    delete process.env.MAPBOX_ACCESS_TOKEN;

    try {
      const coords = await geocodeAddress("Rua Example, Rio de Janeiro, RJ, Brasil");
      assert.equal(coords?.lat, -22.9068);
      assert.equal(coords?.lng, -43.1729);
      assert.ok(fetchMock.mock.calls.some((c) => String(c.arguments[0]).includes("nominatim")));
    } finally {
      process.env.VITE_MAPBOX_TOKEN = prevMapbox;
      process.env.MAPBOX_ACCESS_TOKEN = prevMapbox2;
      mock.restoreAll();
    }
  });
});
