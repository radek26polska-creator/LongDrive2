{
  "name": "KeyLog",
  "type": "object",
  "properties": {
    "vehicleId": {
      "type": "string",
      "description": "ID pojazdu"
    },
    "driverId": {
      "type": "string",
      "description": "ID kierowcy"
    },
    "action": {
      "type": "string",
      "enum": [
        "issued",
        "returned"
      ],
      "description": "Typ akcji - wydanie lub zwrot"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "Data i czas zdarzenia"
    },
    "notes": {
      "type": "string",
      "description": "Uwagi"
    },
    "issuedBy": {
      "type": "string",
      "description": "Kto wyda\u0142 klucze"
    }
  },
  "required": [
    "vehicleId",
    "action",
    "timestamp"
  ]
}