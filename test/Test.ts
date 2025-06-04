import assert from "assert";
import { 
  TestHelpers,
  Blacksmith_Upgraded
} from "generated";
const { MockDb, Blacksmith } = TestHelpers;

describe("Blacksmith contract Upgraded event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Blacksmith contract Upgraded event
  const event = Blacksmith.Upgraded.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Blacksmith_Upgraded is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Blacksmith.Upgraded.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualBlacksmithUpgraded = mockDbUpdated.entities.Blacksmith_Upgraded.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedBlacksmithUpgraded: Blacksmith_Upgraded = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      implementation: event.params.implementation,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualBlacksmithUpgraded, expectedBlacksmithUpgraded, "Actual BlacksmithUpgraded should be the same as the expectedBlacksmithUpgraded");
  });
});
