import {expect,it} from "vitest";
import {recommendedProducts} from "../src/data/merchant-products";
it("prioritises audio at retail counters and QR for individual services",()=>{
  expect(recommendedProducts("retail-shopping")).toEqual(["soundbox","qr","card","loan"]);
  expect(recommendedProducts("individual-services")).toEqual(["qr","soundbox","card","loan"]);
});
