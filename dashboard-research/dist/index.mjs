import path from 'path';
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common/logging';

const app = new App({
  logger: new ConsoleLogger("@tests/tab", { level: "debug" })
});
app.tab("test", path.resolve("dist/client"));
app.function(
  "post-to-chat",
  async ({ data, send, getCurrentConversationId }) => {
    await send(data.message);
    return {
      conversationId: await getCurrentConversationId()
    };
  }
);
app.on("message", async ({ activity, reply }) => {
  reply(`You said: ${activity.text}`);
});
app.start(process.env.PORT || 3978).catch(console.error);
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map