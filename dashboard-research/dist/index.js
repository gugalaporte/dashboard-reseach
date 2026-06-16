'use strict';

var path = require('path');
var teams_apps = require('@microsoft/teams.apps');
var logging = require('@microsoft/teams.common/logging');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var path__default = /*#__PURE__*/_interopDefault(path);

const app = new teams_apps.App({
  logger: new logging.ConsoleLogger("@tests/tab", { level: "debug" })
});
app.tab("test", path__default.default.resolve("dist/client"));
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
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map