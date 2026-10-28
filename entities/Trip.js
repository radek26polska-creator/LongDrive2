{
  "name": "Trip",
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
    "orderedBy": {
      "type": "string",
      "description": "Kto zleci\u0142 przejazd"
    },
    "startDate": {
      "type": "string",
      "format": "date-time",
      "description": "Data rozpocz\u0119cia"
    },
    "endDate": {
      "type": "string",
      "format": "date-time",
      "description": "Data zako\u0144czenia"
    },
    "startMileage": {
      "type": "number",
      "description": "Przebieg na starcie"
    },
    "endMileage": {
      "type": "number",
      "description": "Przebieg na ko\u0144cu"
    },
    "startLocation": {
      "type": "string",
      "description": "Miejsce startu"
    },
    "endLocation": {
      "type": "string",
      "description": "Miejsce docelowe"
    },
    "purpose": {
      "type": "string",
      "description": "Cel podr\u00f3\u017cy"
    },
    "startFuelLevel": {
      "type": "number",
      "description": "Pocz\u0105tkowy stan paliwa"
    },
    "endFuelLevel": {
      "type": "number",
      "description": "Ko\u0144cowy stan paliwa"
    },
    "fuelAdded": {
      "type": "number",
      "description": "Dolane paliwo w litrach"
    },
    "fuelReceiptNumber": {
      "type": "string",
      "description": "Nr kwitu paliwowego"
    },
    "fuelStation": {
      "type": "string",
      "description": "Gdzie zatankowano"
    },
    "status": {
      "type": "string",
      "enum": [
        "in_progress",
        "completed",
        "cancelled"
      ],
      "default": "in_progress"
    },
    "notes": {
      "type": "string",
      "description": "Dodatkowe uwagi"
    },
    "cardNumber": {
      "type": "string",
      "description": "Numer karty drogowej"
    },
    "tripNumber": {
      "type": "string",
      "description": "Numer przejazdu"
    },
    "departureDate": {
      "type": "string",
      "description": "Data wyjazdu"
    },
    "departureTime": {
      "type": "string",
      "description": "Godzina wyjazdu"
    },
    "returnDate": {
      "type": "string",
      "description": "Data powrotu"
    },
    "returnTime": {
      "type": "string",
      "description": "Godzina powrotu"
    },
    "startFuel": {
      "type": "number",
      "description": "Stan paliwa na start"
    },
    "endFuel": {
      "type": "number",
      "description": "Stan paliwa na koniec"
    },
    "route": {
      "type": "string",
      "description": "Trasa"
    },
    "routeFrom": {
      "type": "string",
      "description": "Sk\u0105d"
    },
    "routeTo": {
      "type": "string",
      "description": "Dok\u0105d"
    },
    "distance": {
      "type": "number",
      "description": "Dystans w km"
    },
    "fuelUsedNorm": {
      "type": "number",
      "description": "Zu\u017cycie paliwa wg normy"
    },
    "fuelUsedActual": {
      "type": "number",
      "description": "Rzeczywiste zu\u017cycie paliwa"
    },
    "fuelSavings": {
      "type": "number",
      "description": "Oszcz\u0119dno\u015b\u0107 paliwa"
    },
    "fuelOveruse": {
      "type": "number",
      "description": "Przekroczenie normy paliwa"
    },
    "workHours": {
      "type": "number",
      "description": "Godziny pracy"
    },
    "workMinutes": {
      "type": "number",
      "description": "Minuty pracy"
    },
    "driverResultsSignature": {
      "type": "string"
    },
    "resultsCalculatedBy": {
      "type": "string"
    },
    "resultsControlSignature": {
      "type": "string"
    },
    "arrivalSignature": {
      "type": "string"
    },
    "remarks": {
      "type": "string",
      "description": "Uwagi"
    },
    "garageLocation": {
      "type": "string",
      "description": "Miejsce gara\u017cowania"
    },
    "driverTechSignature": {
      "type": "string"
    },
    "roadControl": {
      "type": "string"
    },
    "outsideRadiusDeclaration": {
      "type": "string"
    },
    "fuelIssuedBy": {
      "type": "string"
    }
  },
  "required": [
    "vehicleId",
    "driverId",
    "startDate"
  ]
}