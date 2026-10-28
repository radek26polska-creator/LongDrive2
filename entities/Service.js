{
  "name": "Service",
  "type": "object",
  "properties": {
    "vehicleId": {
      "type": "string",
      "description": "ID pojazdu"
    },
    "serviceType": {
      "type": "string",
      "enum": [
        "inspection",
        "oil_change",
        "tires",
        "brakes",
        "repair",
        "other"
      ],
      "description": "Typ serwisu"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Data serwisu"
    },
    "mileageAtService": {
      "type": "number",
      "description": "Przebieg przy serwisie"
    },
    "cost": {
      "type": "number",
      "description": "Koszt serwisu"
    },
    "description": {
      "type": "string",
      "description": "Opis wykonanych prac"
    },
    "nextServiceDate": {
      "type": "string",
      "format": "date",
      "description": "Data nast\u0119pnego serwisu"
    },
    "nextServiceMileage": {
      "type": "number",
      "description": "Przebieg nast\u0119pnego serwisu"
    },
    "workshopName": {
      "type": "string",
      "description": "Nazwa warsztatu"
    },
    "invoiceNumber": {
      "type": "string",
      "description": "Numer faktury"
    }
  },
  "required": [
    "vehicleId",
    "serviceType",
    "date"
  ]
}