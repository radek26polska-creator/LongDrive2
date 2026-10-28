{
  "name": "CompanySettings",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Nazwa firmy"
    },
    "address": {
      "type": "string",
      "description": "Adres"
    },
    "zipCode": {
      "type": "string",
      "description": "Kod pocztowy"
    },
    "city": {
      "type": "string",
      "description": "Miasto"
    },
    "nip": {
      "type": "string",
      "description": "NIP"
    },
    "regon": {
      "type": "string",
      "description": "REGON"
    },
    "phone": {
      "type": "string",
      "description": "Telefon"
    },
    "email": {
      "type": "string",
      "description": "Email"
    },
    "logoUrl": {
      "type": "string",
      "description": "URL logo firmy"
    },
    "theme": {
      "type": "string",
      "enum": [
        "dark",
        "light",
        "blue",
        "green"
      ],
      "default": "dark"
    },
    "cardCounter": {
      "type": "number",
      "description": "Licznik kart drogowych",
      "default": 1
    },
    "cardPrefix": {
      "type": "string",
      "description": "Prefiks numeru karty",
      "default": "KD"
    }
  },
  "required": [
    "name"
  ]
}