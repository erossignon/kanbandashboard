///*
// * A custome redmine ticket analyser
// *
// */
//function cat(redmine_ticket) {
//  "use strict";
//  if (!redmine_ticket.category) { return " ----"; }
//  return redmine_ticket.category.name;
//}
//
//function extract_custom_field(redmine_ticket, field_name) {
//  "use strict";
//  var value = "";
//  for (var d in redmine_ticket.custom_fields) {
//    if (redmine_ticket.custom_fields.hasOwnProperty(d)) {
//      var o = redmine_ticket.custom_fields[d];
//      if (o.name === field_name) {
//        value = o.value + o.id;
//      }
//    }
//  }
//  return value;
//}
//
//function redmine_is_use_case(redmine_ticket) {
//  "use strict";
//  var c = cat(redmine_ticket);
//  // REFCOL
//  if (redmine_ticket.tracker.name === "Exigence" && c === "Cas d\'utilisation") { return true; }
//  // OPTI
//  if (redmine_ticket.tracker.name === "Feature") { return true; }
//
//  return false;
//}
//
//
//function redmine_is_user_story(redmine_ticket) {
//  "use strict";
//  var c = cat(redmine_ticket);
//
//  // REFCOL
//  if (redmine_ticket.tracker.name === "Exigence" && c === "User Story") { return true; }
//  // OPTI
//  if (redmine_ticket.tracker.name === "User story") {
//    return true;
//  }
//
//  return false;
//}
//
//function redmine_is_acceptance(redmine_ticket) {
//
//  if (redmine_ticket.tracker.name === "FAE - ANO") {  return true; }
//  if (redmine_ticket.tracker.name === "FAE - EVO") {  return true; }
//  return false;
//}
//
//function redmine_is_evolution(redmine_ticket)  {
//  if (redmine_ticket.tracker.name === "Evolution") {  return true; }
//  return false;
//}
//
//function redmine_is_defect(redmine_ticket) {
//  "use strict";
//
//  // REF COL
//  if (redmine_ticket.tracker.name === "Anomalie")  {  return true; }
//
//  /// OPTI
//  if (redmine_ticket.tracker.name === "OTD") { return true; }
//  if (redmine_ticket.tracker.name === "Bug") { return true; }
//
//  return false;
//}
//
//function redmine_is_arbitrage(redmine_ticket) {
//  "use strict";
//  // REF COL
//  if (redmine_ticket.tracker.name === "Action") { return true; }
//  return false;
//}
//
//function redmine_is_test_case(redmine_ticket) {
//  "use strict";
//  if (redmine_ticket.tracker.name === "Fiche de test") { return true; }
//  return false;
//}
//
//exports.redmine_complexity = function redmine_complexity(redmine_ticket) {
//    extract_custom_field(redmine_ticket, "Complexité");
//}
//
///* return true if the project is unplanned */
//exports.redmine_is_projectid_unplanned = function (project_id) {
// if (project_id === undefined ) {
//     return true;
// }
// if (project_id === 737 ) { // Planning en attente RT v1.x
//     return true;
// }
// if (project_id === 863 ) { // ST v2.X
//     return true;
// }
// return false;
//}
//
//// redmine_ticket.fixed_version.name === "Sprint XX VA+ - HL" ||
//// redmine_ticket.fixed_version.name === "Sprint YY VB - HL") {
////
//exports.redmine_check_unplanned = function redmine_check_unplanned(redmine_ticket) {
//  "use strict";
//
//  if (!redmine_ticket.fixed_version) { return true; }
//  return exports.redmine_is_projectid_unplanned(redmine_ticket.fixed_version.id);
////xx
////xx  // REFL COL
////xx  if (redmine_ticket.fixed_version.name === "RT v1.x" ||
////xx      redmine_ticket.fixed_version.name === "ST v2.X" }
////xx
////xx     console.warn(" UNPLANNED ",redmine_ticket.fixed_version.name);
////xx    return true;
////xx  }
////xx   console.warn(" PLANNED ",redmine_ticket.fixed_version.name);
////xx  return false;
//}
//
//
//
//
//
//var status_OPTI = {
//  1: 'Nouveau',
//  2: 'En Cours',
// 22: 'Spec',
// 21: 'Dev',
// 20: 'A Tester',
//  6: 'rejeté',
//  5: 'Terminé'
//};
//
//function simple_status_opti(value) {
//  value = parseInt(value);
//  var ret = '----';
//  switch (value) {
//    case 1: return "New";
//       return "proposed";
//    case 6:
//    case 5: return "Done";
//    default:
//      return "In Progress";
//  }
//  return "In Progress";
//}
//
//var status = {
//    12:'Traité',
//    13:'Fermé',
//    15:'Analyse ERW',
//    8:'Analyse Client',
//    9:'Chiffré',
//    10:'Validé',
//    11:'En Cours',
//    16:'Livré',
//    14:'Refusé',
//    17:'Facturé',
//    18:'OK',
//    19:'KO',
//    20:'Non applicable',
//    21:'Implémentée',
//    22:'Problème',
//    7:'Nouveau'
//};
//
//
//function simple_status_refcoll(value) {
//    "use strict";
//    value = parseInt(value);
//    var ret = '----';
//    switch (value) {
//
//        // ----------------- Backlog ----------------
//        case 7: // Nouveau
//            ret = "New";
//            break;
//        case 15: // analyse ERW  N
//        case  8: // analyse Client
//        case 10: // validé
//        case 11: // En cours   (en attente de dev, en dev ,en attente de test interne)
//        case 12: // Traité     // tous - fait chez Euriware et tester par Euriware
//        case  9: // chiffré
//            ret = "In Progress";
//            break;
//        case 21: // implémenté;// exigence
//        case 16: // Livré      // FAE-ANO    7261
//        case 14: // refusé
//        case 13: // Fermé
//        case 20:// Non Applicable
//            ret = "Done"
//            break;
//        default:
//            ret = "***" + status[value] + "    -> " + value;
//    }
//    return ret;
//}
//
//function simple_status_refcoll_obsolte(value) {
//    "use strict";
//    value = parseInt(value);
//    var ret = '----';
//    switch (value) {
//
//        // ----------------- Backlog ----------------
//        case 7: // Nouveau
//            ret = "Nouveau";
//            break;
//        case 15: // analyse ERW
//        case  8: // analyse Client
//            ret = "Analyse";
//            break;
//        // ----------------- Backlog ----------------
//
//        case  9: // chiffré
//        case 10: // validé
//            ret = "W-En attente de dev"; // analyse faites
//            break;
//
//        case 11: // En cours   (en attente de dev, en dev ,en attente de test interne)
//            ret = "developmnent" ;
//            break;
//
//
//        case 12: // Traité     // tous - fait chez Euriware et tester par Euriware
//            ret = "en attente de livraison";
//            break;
//        case 21: // implémenté;// exigence
//        case 16: // Livré      // FAE-ANO    7261
//        case 14: // refusé
//        case 13: // Fermé
//        case 20:// Non Applicable
//
//            ret = "+Done";
//            break;
//        default:
//            ret = typeof(value) + "***" + status[value];
//    }
//    //if (value == 7) return 'Nouveau';
//
//    return ret;
//
//}
//
//exports.redmine_simple_status = function redmine_simple_status(value) {
//  //return  simple_status_opti(value);
//  return  simple_status_refcoll(value);
//};
//
//
//exports.redmine_ticket_type = function redmine_ticket_type(redmine_ticket) {
//  "use strict";
//  if (redmine_is_acceptance(redmine_ticket)) { return "QA";      }
//  if (redmine_is_defect(redmine_ticket))     { return "BUG";      }
//  if (redmine_is_evolution(redmine_ticket))  { return "EVO";      }
//  if (redmine_is_arbitrage(redmine_ticket))  { return "ARB";      }
//  if (redmine_is_user_story(redmine_ticket)) { return "U-S";      }
//  if (redmine_is_use_case(redmine_ticket))   { return "U-C";      }
//  if (redmine_is_test_case(redmine_ticket))  { return "Test Case";}
//
//  return "??";
//};
