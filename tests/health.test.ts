import chai from "chai";
import chaiHttp from "chai-http";
import server from "../src/server";

chai.use(chaiHttp);
const expect = chai.expect;

describe("/health Endpoint Tests", () => {
  it("should return a 200 status code if server is up", async () => {
    const res = await chai.request(server).get("/health");
    expect(res).to.have.status(200);
  });
});
