{
  "name": "Vehicle",
  "type": "object",
  "properties": {
    "make": {
      "type": "string",
      "description": "Marka pojazdu"
    },
    "model": {
      "type": "string",
      "description": "Model pojazdu"
    },
    "year": {
      "type": "number",
      "description": "Rok produkcji"
    },
    "registrationNumber": {
      "type": "string",
      "description": "Numer rejestracyjny"
    },
    "mileage": {
      "type": "number",
      "description": "Przebieg w km"
    },
    "fuelLevel": {
      "type": "number",
      "description": "Poziom paliwa w litrach"
    },
    "tankSize": {
      "type": "number",
      "description": "Pojemno\u015b\u0107 zbiornika w litrach"
    },
    "fuelConsumption": {
      "type": "number",
      "description": "\u015arednie zu\u017cycie paliwa l/100km"
    },
    "status": {
      "type": "string",
      "enum": [
        "available",
        "in_use",
        "maintenance",
        "unavailable"
      ],
      "default": "available",
      "description": "Status pojazdu"
    },
    "vehicleType": {
      "type": "string",
      "enum": [
        "Osobowe",
        "BUS",
        "Ci\u0119\u017carowe",
        "Dostawcze"
      ],
      "description": "Typ pojazdu"
    },
    "fuelType": {
      "type": "string",
      "enum": [
        "Benzyna",
        "Diesel",
        "LPG",
        "Elektryczny",
        "Hybryda"
      ],
      "description": "Rodzaj paliwa"
    },
    "engineCapacity": {
      "type": "number",
      "description": "Pojemno\u015b\u0107 silnika w cm3"
    },
    "bodyType": {
      "type": "string",
      "description": "Typ nadwozia"
    },
    "vin": {
      "type": "string",
      "description": "Numer VIN"
    },
    "insuranceExpiry": {
      "type": "string",
      "format": "date",
      "description": "Data wyga\u015bni\u0119cia ubezpieczenia"
    },
    "inspectionExpiry": {
      "type": "string",
      "format": "date",
      "description": "Data wyga\u015bni\u0119cia przegl\u0105du"
    },
    "imageUrl": {
      "type": "string",
      "description": "URL zdj\u0119cia pojazdu"
    }
  },
  "required": [
    "make",
    "model",
    "registrationNumber"
  ]
}