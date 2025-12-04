# User Creation Guide

This guide explains how to create users in the Iki app, both individually and in bulk using CSV upload.

## Overview

Users can be created through the admin dashboard in two ways:
1. **Single User Creation**: Create one user at a time through a form
2. **Bulk CSV Upload**: Upload multiple users at once using a CSV file

## Important Notes

- Users created through this system will **NOT** have onboarding marked as complete
- They will be able to continue with the onboarding process when they first log in
- Users are created in Firebase Auth and their data is stored in Firestore
- Email and password are required fields
- All other fields are optional

## Single User Creation

### Required Fields
- **Email**: Valid email address (must be unique)
- **Password**: Minimum 8 characters

### Optional Fields
- First Name
- Last Name
- Username
- Phone
- Country
- Gender (Male, Female, Other, Prefer not to say)
- Birthday (YYYY-MM-DD format)
- Age (number)
- Activity Level (sedentary, light, moderate, active, very_active)
- Body Weight (kg, decimal number)

## Bulk CSV Upload

### CSV Format

Your CSV file should have the following columns (case-insensitive):

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| `email` | Yes | User's email address | `user@example.com` |
| `password` | Yes* | User's password (min 8 chars) | `SecurePass123` |
| `firstname` | No | User's first name | `John` |
| `lastname` | No | User's last name | `Doe` |
| `username` | No | Username (will be lowercased) | `johndoe` |
| `phone` | No | Phone number | `+1234567890` |
| `country` | No | Country name | `USA` |
| `gender` | No | Gender | `Male`, `Female`, `Other`, `Prefer not to say` |
| `birthday` | No | Birthday (YYYY-MM-DD) | `1990-01-01` |
| `age` | No | Age (number) | `34` |
| `activityLevel` | No | Activity level | `moderate` |
| `bodyWeightKg` | No | Body weight in kg (decimal) | `75.5` |

*Note: If password is not provided in the CSV, a random secure password will be generated automatically.

### CSV Example

```csv
email,password,firstname,lastname,username,phone,country,gender,birthday,age,activityLevel,bodyWeightKg
user1@example.com,SecurePass123,John,Doe,johndoe,+1234567890,USA,Male,1990-01-01,34,moderate,75.5
user2@example.com,AnotherPass456,Jane,Smith,janesmith,+0987654321,Canada,Female,1992-05-15,32,active,65.0
user3@example.com,,Bob,Johnson,bobjohnson,,UK,Other,1988-12-20,36,sedentary,80.0
```

### CSV Template

You can download a CSV template from the bulk upload interface. The template includes:
- All column headers
- One example row showing the format

### Bulk Upload Process

1. Click "Create User" button on the Users page
2. Select "Bulk Upload (CSV)" tab
3. Download the template (optional, to see the format)
4. Fill in your CSV file with user data
5. Upload the CSV file
6. Review the results:
   - Successfully created users (with generated passwords if not provided)
   - Failed users with error messages
7. Download results CSV (contains all created users with their passwords)

### Password Generation

If a password is not provided in the CSV for a user, a random secure password will be generated with:
- 12 characters length
- Mix of uppercase, lowercase, numbers, and special characters
- The generated password will be included in the results CSV

## User Data Structure

When a user is created, the following data structure is initialized in Firestore:

```json
{
  "firstname": "",
  "lastname": "",
  "username": "",
  "usernameLowercase": "",
  "email": "",
  "phone": "",
  "country": "",
  "photoUrl": "",
  "gender": "",
  "birthday": "",
  "points": 0,
  "age": null,
  "activityLevel": "",
  "bodyWeightKg": null,
  "health_stats": [
    { "id": "quarterly_wellness", "name": "Quarterly Wellness", "value": 0 },
    { "id": "prevention_wellness", "name": "Prevention Wellness", "value": 0 },
    { "id": "nutritional_wellness", "name": "Nutritional Wellness", "value": 0 },
    { "id": "mental_wellness", "name": "Mental Wellness", "value": 0 },
    { "id": "physical_wellness", "name": "Physical Wellness", "value": 0 },
    { "id": "financial_wellness", "name": "Financial Wellness", "value": 0 }
  ],
  "onboardingCompleted": false,
  "onboardingData": null
}
```

## Onboarding Flow

Users created through this system:
- Have `onboardingCompleted: false`
- Have `onboardingData: null`
- Will be prompted to complete onboarding when they first log in
- Can continue with the normal onboarding flow in the app

## Error Handling

### Common Errors

1. **Email already exists**: The email is already registered in Firebase Auth
2. **Invalid email**: The email format is invalid
3. **Weak password**: Password doesn't meet requirements (min 8 characters)
4. **CSV parsing error**: The CSV format is incorrect
5. **Missing required fields**: Email is missing from a row

### Bulk Upload Errors

- Errors are shown per-row in the results
- Successfully created users are still created even if some fail
- You can download a results CSV with all outcomes

## API Endpoints

### Create Single User
- **Endpoint**: `POST /api/users/create`
- **Auth**: Requires admin or superadmin role
- **Body**: JSON with user fields

### Bulk Upload
- **Endpoint**: `POST /api/users/bulk-upload`
- **Auth**: Requires admin or superadmin role
- **Body**: FormData with CSV file

## Security

- Only users with `admin` or `superadmin` roles can create users
- Passwords are hashed using Firebase Auth's secure hashing
- Email verification is set to `false` initially (users verify on first login)
- All API endpoints check for proper authentication and authorization

