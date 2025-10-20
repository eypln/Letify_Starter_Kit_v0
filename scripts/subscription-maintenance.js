"use strict";
// Scheduled script: subscription-maintenance.ts
// - Sends reminder emails 3 and 1 day before subscription end
// - Downgrades users to free plan if not renewed after period end
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
// Email fonksiyonu kaldırıldı, sadece downgrade işlemi yapılacak
var supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var now, _a, activeSubs, error, _i, _b, sub, end;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    now = new Date();
                    return [4 /*yield*/, supabase
                            .from('billing_subscriptions')
                            .select('id, user_id, current_period_end, plan_type, status')
                            .eq('status', 'active')];
                case 1:
                    _a = _c.sent(), activeSubs = _a.data, error = _a.error;
                    if (error)
                        throw error;
                    _i = 0, _b = activeSubs || [];
                    _c.label = 2;
                case 2:
                    if (!(_i < _b.length)) return [3 /*break*/, 5];
                    sub = _b[_i];
                    end = new Date(sub.current_period_end);
                    if (!(now > end)) return [3 /*break*/, 4];
                    return [4 /*yield*/, supabase
                            .from('billing_subscriptions')
                            .update({ plan_type: 'free', status: 'canceled' })
                            .eq('id', sub.id)];
                case 3:
                    var updateResult = _c.sent();
                    if (updateResult.error) {
                        console.error('Update error:', updateResult.error);
                    } else {
                        console.log('Update result:', updateResult.data);
                    }
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
