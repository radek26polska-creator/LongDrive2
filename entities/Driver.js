{
  "name": "Driver",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Imi\u0119 i nazwisko kierowcy"
    },
    "phone": {
      "type": "string",
      "description": "Numer telefonu"
    },
    "email": {
      "type": "string",
      "description": "Adres email"
    },
    "licenseNumber": {
      "type": "string",
      "description": "Numer prawa jazdy"
    },
    "licenseExpiry": {
      "type": "string",
      "format": "date",
      "description": "Data wa\u017cno\u015bci prawa jazdy"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "inactive",
        "on_leave"
      ],
      "default": "active"
    },
    "avatarUrl": {
      "type": "string",
      "description": "URL zdj\u0119cia kierowcy"
    }
  },
  "required": [
    "name"
  ]
}