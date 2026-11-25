/* IIFE: klasické <script> tagy zdieľajú jeden globálny rozsah, takže bez neho
 * by sa deklarácie z common.js a tohto súboru navzájom prekryli a skript by
 * skončil na "Identifier has already been declared". */
(function () {
  "use strict";

const { initHeader } = window.appCommon;

// Stránka je statická - jediné, čo potrebuje, je prihlásený používateľ
// a inicializovaná hlavička (aktívna položka, admin odkaz, odhlásenie).
initHeader();
})();
