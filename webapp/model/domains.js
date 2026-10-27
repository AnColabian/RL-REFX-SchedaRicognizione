sap.ui.define([
    "schedaricognizione/model/formatter"
], function (formatter) {
    "use strict";

    /*
     * Associazione proprietà OData della scheda -> possibili valori di "nomeCampo"
     * restituiti dall'entity helpValInp (nomi campo ABAP della tabella scheda).
     * Il match è case-insensitive, ignora caratteri non alfanumerici e l'eventuale
     * prefisso "ZZ". Viene accettato anche il nome della proprietà OData stessa.
     */
    var mFieldAliases = {
        dtCompil: ["DTCOMP"],
        docValorizz: ["DOCVAL"],
        idBene: ["IDBENE"],
        entePropr: ["ENTEPR"],
        denomBene: ["TXBENE"],
        coorGIS: ["COOGIS"],
        tipologia: ["FABTER"],
        usoEdif: ["USOFAB"],
        usoTerr: ["USOTER"],
        supLU: ["SUPLUT"],
        supFond: ["SUPFON"],
        accessib: ["ACCESS"],
        porzEdif: ["PORZED"],
        numEdif: ["NUMEDI"],
        numLivFuo: ["NUMFUO"],
        numLivEnt: ["NUMENT"],
        collegam: ["COLLEG"],
        strPort: ["STPORT"],
        tampon: ["TAMPON"],
        copert: ["COPERT"],
        serram: ["SERRAM"],
        partInt: ["PARTIZ"],
        finiture: ["FINITU"],
        impianti: ["IMPIAN"],
        pertin: ["PERTIN"],
        supCop: ["SUPCOP"],
        supScop: ["SUPSCO"],
        zonOMI: ["ZONOMI"],
        presApe: ["APE"],
        clsEnerg: ["CLSENE"],
        titProv: ["TITOLO"],
        annoAcquis: ["ANNOPR"],
        attiLimit: ["LIMITI"],
        annoCostr: ["ANNOCS"],
        stGener: ["STGENE"],
        stStrPort: ["STSPOR"],
        stCopert: ["STCOPE"],
        stTampon: ["STTAMP"],
        stChiusEst: ["STCHES"],
        stInter: ["STPART"],
        stFinit: ["STFINI"],
        stImpian: ["STIMPI"],
        stConsNote: ["STNOTE"],
        stOccup: ["STOCCU"],
        soggOccup: ["SOGOCC"],
        natOccup: ["NATOCC"],
        tipOccup: ["TIPOCC"],
        vincoli: ["VINCOL"],
        intCultMIB: ["INTCUL"],
        autMibAli: ["AUTALI"],
        destUrb: ["DSTURB"],
        iterUrb: ["ITERUR"],
        titOrig: ["TITORI"],
        ante67: ["ANTE67"],
        ante42: ["ANTE42"],
        corrCat: ["CORCAT"],
        certAgib: ["CERAGI"],
        collStat: ["COLLST"],
        docAmbien: ["DOCAMB"],
        vulnRSism: ["VULSSM"],
        vulnRIdro: ["VULAMB"],
        stimaVal: ["STIMAV"],
        stimaNote: ["STIMNT"],
        annoValor: ["ANNOVL"],
        canLocaz: ["CANLOC"],
        progPrec: ["PRGPRC"],
        delinInsPDA: ["DELIBE"],
        garaVend: ["ESPGAR"],
        esitoAsta: ["ESITOA"]
    };

    function normalizeName(sName) {
        return String(sName === null || sName === undefined ? "" : sName).toUpperCase().replace(/[^A-Z0-9]/g, "");
    }

    function trimValue(vValue) {
        return vValue === null || vValue === undefined ? "" : String(vValue).trim();
    }

    function findEntry(vValue, aDomain) {
        if (!Array.isArray(aDomain)) {
            return null;
        }
        var sValue = trimValue(vValue);
        if (!sValue) {
            return null;
        }
        return aDomain.find(function (oEntry) {
            return oEntry.valore === sValue;
        }) || null;
    }

    return {
        /**
         * Raggruppa le righe di helpValInp per proprietà OData della scheda.
         * @param {object[]} aRows righe restituite dal backend
         * @param {string[]} aProperties proprietà della testata scheda
         * @returns {{domains: object, unmatched: string[]}}
         */
        groupByProperty: function (aRows, aProperties) {
            var mLookup = {};
            (aProperties || []).forEach(function (sProperty) {
                mLookup[normalizeName(sProperty)] = sProperty;
                (mFieldAliases[sProperty] || []).forEach(function (sAlias) {
                    mLookup[normalizeName(sAlias)] = sProperty;
                });
            });
            var mDomains = {};
            var oUnmatched = new Set();
            (aRows || []).forEach(function (oRow) {
                var sKey = normalizeName(oRow.nomeCampo);
                if (!sKey) {
                    return;
                }
                var sProperty = mLookup[sKey] || mLookup[sKey.replace(/^ZZ/, "")];
                if (!sProperty) {
                    oUnmatched.add(trimValue(oRow.nomeCampo));
                    return;
                }
                var sValue = trimValue(oRow.valore);
                if (!sValue) {
                    return;
                }
                mDomains[sProperty] = mDomains[sProperty] || [];
                if (mDomains[sProperty].some(function (oEntry) { return oEntry.valore === sValue; })) {
                    return;
                }
                mDomains[sProperty].push({
                    valore: sValue,
                    descriz: trimValue(oRow.descriz),
                    posiz: trimValue(oRow.posiz)
                });
            });
            Object.keys(mDomains).forEach(function (sProperty) {
                mDomains[sProperty].sort(function (a, b) {
                    var iA = parseInt(a.posiz, 10);
                    var iB = parseInt(b.posiz, 10);
                    if (!isNaN(iA) && !isNaN(iB) && iA !== iB) {
                        return iA - iB;
                    }
                    return a.posiz.localeCompare(b.posiz) || a.valore.localeCompare(b.valore);
                });
            });
            return {
                domains: mDomains,
                unmatched: Array.from(oUnmatched)
            };
        },

        /** Testo descrittivo accanto all'Input (Create / Edit). */
        formatDescription: function (vValue, aDomain) {
            var oEntry = findEntry(vValue, aDomain);
            return oEntry ? oEntry.descriz : "";
        },

        /** Testo in visualizzazione: "codice - descrizione". */
        formatDisplay: function (vValue, aDomain) {
            var oEntry = findEntry(vValue, aDomain);
            if (!oEntry) {
                return formatter.formatDisplayValue(vValue);
            }
            return oEntry.descriz ? oEntry.valore + " - " + oEntry.descriz : oEntry.valore;
        }
    };
});