"use strict";
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
var fs = require("fs");
var path = require("path");
var sync_1 = require("csv-parse/sync");
var DatabaseSync_1 = require("./src/utils/DatabaseSync");
function syncAllMissingData() {
    return __awaiter(this, void 0, void 0, function () {
        var files, _i, files_1, fileInfo, fullPath, content, records, success, errors, i, row, job, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("🚀 Starting Bulk Upsert from CSV to Database...");
                    files = [
                        { path: 'data/linkedin_clean_data.csv', source: 'LinkedIn' },
                        { path: 'data/wuzzuf_clean_data_v3.csv', source: 'Wuzzuf' }
                    ];
                    _i = 0, files_1 = files;
                    _a.label = 1;
                case 1:
                    if (!(_i < files_1.length)) return [3 /*break*/, 10];
                    fileInfo = files_1[_i];
                    fullPath = path.resolve(__dirname, fileInfo.path);
                    if (!fs.existsSync(fullPath)) {
                        console.log("[!] File not found: ".concat(fullPath));
                        return [3 /*break*/, 9];
                    }
                    console.log("\n\uD83D\uDCC2 Processing: ".concat(fileInfo.path));
                    content = fs.readFileSync(fullPath, 'utf8');
                    records = (0, sync_1.parse)(content, {
                        columns: true,
                        skip_empty_lines: true,
                        relax_quotes: true,
                        relax_column_count: true
                    });
                    success = 0;
                    errors = 0;
                    console.log("Found ".concat(records.length, " jobs in ").concat(fileInfo.source, ". Upserting live..."));
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < records.length)) return [3 /*break*/, 8];
                    row = records[i];
                    job = {
                        job_id: row['Job Id'] || row['Job ID'] || '',
                        title: row['Job Title'] || '',
                        company: row['Company Name'] || '',
                        location: row['Location'] || '',
                        url: row['Job URL'] || row['URL'] || '',
                        job_type: row['Job Type'] || '',
                        work_type: row['Work Type'] || '',
                        career_level: row['Experience Level'] || row['Experience Needed'] || '',
                        education_level: row['Education Level'] || '',
                        job_categories: row['Industry'] || row['Job Categories'] || '',
                        description: row['Description'] || '',
                        requirements: row['Requirements'] || row['Job Requirements'] || ''
                    };
                    // Skip invalid jobs
                    if (!job.job_id || !job.title)
                        return [3 /*break*/, 7];
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, DatabaseSync_1.DatabaseSync.upsertJob(job, fileInfo.source)];
                case 4:
                    _a.sent();
                    success++;
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    errors++;
                    return [3 /*break*/, 6];
                case 6:
                    if ((i + 1) % 500 === 0) {
                        console.log("   -> Processed ".concat(i + 1, "/").concat(records.length, " jobs..."));
                    }
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 2];
                case 8:
                    console.log("\u2705 Finished ".concat(fileInfo.source, ". Successfully synced: ").concat(success, ". Errors: ").concat(errors, "."));
                    _a.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 1];
                case 10: return [4 /*yield*/, DatabaseSync_1.DatabaseSync.close()];
                case 11:
                    _a.sent();
                    console.log("\n🎉 ALL MISSING DATA HAS BEEN SYNCED TO THE DATABASE!");
                    return [2 /*return*/];
            }
        });
    });
}
syncAllMissingData().catch(console.error);
