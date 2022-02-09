"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const completionProviders = require("./modules/CompletionProviders");
function activate(context) {
    context.subscriptions.push(...completionProviders.providers);
}
exports.activate = activate;
;
function deactivate() { }
exports.deactivate = deactivate;
;
