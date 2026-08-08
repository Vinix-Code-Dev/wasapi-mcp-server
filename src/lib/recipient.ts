/**
 * Descripciones del slot de identificador de contacto (WSP-529).
 *
 * Meta permite a un usuario de WhatsApp **ocultar su número**. Ese contacto llega sin
 * teléfono y se identifica con un BSUID (`XX.<alfanumérico>`, por portafolio de negocio) y,
 * casi siempre, con su username público.
 *
 * La API de Wasapi ya resuelve los tres identificadores en el mismo campo `wa_id`: clasifica
 * por formato y consulta una sola columna. El SDK pasa el valor sin tocarlo, así que del lado
 * del MCP no hay nada que traducir — lo único que faltaba era **decírselo al modelo**.
 *
 * Estas constantes viven acá, y no repetidas en cada tool, porque el texto ES el contrato con
 * el modelo: si una descripción dice "E.164 sin +" y otra admite username, el agente elige
 * la vía equivocada según el tool que toque. Ya pasó con las descripciones originales, donde
 * las 11 familias declaraban únicamente E.164 y un contacto de número oculto quedaba
 * inalcanzable.
 */

/** Slot `wa_id` de los tools de envío y de lectura de conversación. */
export const WA_ID_DESCRIPTION =
  'Identificador del contacto destinatario. Acepta tres formas y Wasapi detecta cuál es por su formato: ' +
  'teléfono en E.164 sin + (p. ej. 573001234567), ' +
  'BSUID de un contacto que oculta su número (p. ej. CO.1234567890123456), ' +
  'o su username de WhatsApp (p. ej. ana.gomez). ' +
  'Si el contacto oculta su número no hay teléfono que usar: toma el bsuid o el wa_username ' +
  'que devuelven list_conversations, list_contacts o get_contact.';

/**
 * Identificador en la familia `/contacts`, que además resuelve por `uuid`. Es un
 * superconjunto del slot de envío: un contacto se puede leer o editar por su uuid, pero no
 * se le puede enviar un mensaje a un uuid.
 */
export const CONTACT_IDENTIFIER_DESCRIPTION =
  'Identificador del contacto. Acepta teléfono en E.164 sin + (p. ej. 573001234567), ' +
  'el uuid del contacto, ' +
  'el BSUID de un contacto que oculta su número (p. ej. CO.1234567890123456), ' +
  'o su username de WhatsApp (p. ej. ana.gomez).';
