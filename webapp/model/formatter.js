sap.ui.define([], () => {
"use strict";
return {
formatDate: function (sValue) {
if (!sValue || sValue.length !== 8) {
return sValue;
}
var sYear = sValue.substring(0, 4);
var sMonth = sValue.substring(4, 6);
var sDay = sValue.substring(6, 8);
return sDay + "/" + sMonth + "/" + sYear;
}
};
});
