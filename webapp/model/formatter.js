sap.ui.define([], () => {
    "use strict";
    return {
        formatDate: function (vValue) {
            if (vValue === null || vValue === undefined || vValue === "") {
                return "";
            }
            var oDate;
            if (vValue instanceof Date) {
                oDate = vValue;
            } else if (typeof vValue === "string") {
                var sValue = vValue.trim();
                if (!sValue || sValue === "00000000") {
                    return "";
                }
                if (/^\d{8}$/.test(sValue)) {
                    return sValue.substring(6, 8) + "/" + sValue.substring(4, 6) + "/" + sValue.substring(0, 4);
                }
                var aMatch = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(sValue);
                if (!aMatch) {
                    return "";
                }
                oDate = new Date(Number(aMatch[1]));
            } else {
                return "";
            }
            if (isNaN(oDate.getTime())) {
                return "";
            }
            var sDay = ("0" + oDate.getUTCDate()).slice(-2);
            var sMonth = ("0" + (oDate.getUTCMonth() + 1)).slice(-2);
            var sYear = ("0000" + oDate.getUTCFullYear()).slice(-4);
            return sDay + "/" + sMonth + "/" + sYear;
        },
        normalizeIntegerLikeValue: function (vValue) {
            if (vValue === null || vValue === undefined) {
                return "";
            }
            var sValue = String(vValue).trim();
            if (!sValue) {
                return "";
            }
            if (!/^[0-9]+(?:[.,]0+)?$/.test(sValue)) {
                return sValue;
            }
            return sValue.split(/[.,]/)[0].replace(/^0+(?=[0-9])/, "");
        },
        normalizeDecimalValue: function (vValue) {
            if (vValue === null || vValue === undefined) {
                return "";
            }
            var sValue = String(vValue).trim();
            if (!sValue) {
                return "";
            }
            var fValue = Number(sValue.replace(",", "."));
            if (!Number.isFinite(fValue)) {
                return sValue;
            }
            return fValue === 0 ? "0" : fValue.toFixed(2);
        },
        parseNumericValue: function (vValue) {
            if (vValue === null || vValue === undefined) {
                return NaN;
            }
            var sValue = String(vValue).trim();
            if (!sValue) {
                return NaN;
            }
            return Number(sValue.replace(",", "."));
        },
        formatDisplayValue: function (vValue) {
            if (vValue === null || vValue === undefined) {
                return "";
            }
            var sValue = String(vValue).trim();
            return /^0+$/.test(sValue) ? "" : sValue;
        },
        formatSchedaState: function (vValue) {
            var sValue = vValue === null || vValue === undefined ? "" : String(vValue).trim();
            var mStates = {
                B: "Provvisorio",
                D: "Definitivo",
                E: "Eliminato"
            };
            return mStates[sValue] || sValue;
        }
    };
});
