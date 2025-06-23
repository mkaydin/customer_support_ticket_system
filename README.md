

# Customer Support Ticket System (LLMInferenceService)

A modern customer support ticketing system powered by Large Language Models (LLMs) for automated issue categorization and empathetic response generation. Built with ASP.NET Core, Razor Pages, and Entity Framework Core (Oracle), this system streamlines customer support workflows by leveraging AI to assist both customers and support staff.

---

## Features

- **AI-Powered Chat**: Customers interact with an LLM assistant that categorizes issues and provides helpful, empathetic responses.
- **Automatic Issue Categorization**: Issues are classified into categories such as Payment, Delivery, Technical Support, etc.
- **Ticket Tracking**: All categorized issues are tracked in a database for follow-up and analytics.
- **Support Dashboard**: Visual dashboard for support staff to monitor, filter, and analyze customer problems.
- **Statistics & Analytics**: View problem category breakdowns, open/closed issue counts, and recent tickets.
- **Modern UI**: Responsive web interface using Bootstrap and Razor Pages.

---

## Project Structure

```
LLMInferenceService/
  ├── InferenceController.cs         # API controller for LLM inference and ticket endpoints
  ├── Program.cs                    # App entry point and service configuration
  ├── Pages/
  │    ├── Index.cshtml             # Customer chat interface
  │    ├── Dashboard.cshtml         # Support staff dashboard
  │    └── _Layout.cshtml           # Shared layout
  ├── Migrations/                   # Entity Framework Core migrations
  ├── appsettings.json              # App configuration
  ├── LLMInferenceService.csproj    # Project file
  └── ... (other config and build files)
```

---

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- Oracle Database (local or remote)
- Node.js (for front-end asset management, optional)

### Configuration

1. **Database Connection**:  
   Update the Oracle connection string in `Program.cs`:
   ```csharp
   var connectionString = "Data Source=localhost:1521/FREE;User Id=YOUR_USER;Password=YOUR_PASSWORD;";
   ```

2. **LLM API Endpoint**:  
   Set the LLM API URL in `InferenceController.cs` (look for `LLM_API_URL`).

3. **App Settings**:  
   Adjust logging and environment settings in `appsettings.json` and `appsettings.Development.json` as needed.

### Database Migration

Run the following commands to apply migrations and create the database schema:

```bash
dotnet ef database update --project LLMInferenceService
```

### Running the Application

```bash
dotnet run --project LLMInferenceService
```

The app will be available at `https://localhost:7120` or `http://localhost:5176` (see `launchSettings.json`).

---

## API Endpoints

- `POST /api/inference`  
  Submit a customer message for LLM categorization and response.

- `GET /api/inference/problems/stats`  
  Retrieve statistics for problem categories.

- `GET /api/inference/problems/recent?limit=10`  
  Get recent customer problems.

---

## Usage

- **Customers**:  
  Visit the main page and describe your issue in the chat. The AI will respond and your issue will be tracked if categorized.

- **Support Staff**:  
  Access the dashboard to view, filter, and analyze all tracked issues.

---

## Technologies Used

- ASP.NET Core 9 (Web API, Razor Pages)
- Entity Framework Core (Oracle)
- Bootstrap 5
- JavaScript (for dynamic dashboard and chat)
- Large Language Model API (configurable)

---

## Customization

- **LLM Model**:  
  Change the model or API endpoint in `InferenceController.cs`.

- **Categories**:  
  Update or expand categories in the system prompt within `InferenceController.cs`.

- **UI**:  
  Modify Razor Pages and CSS in the `Pages/` directory.

---

## License

This project is for educational and demonstration purposes.  
For production use, review and update security, error handling, and compliance as needed.

---

## Acknowledgments

- [Microsoft ASP.NET Core](https://docs.microsoft.com/aspnet/core/)
- [Oracle Entity Framework Core](https://docs.oracle.com/en/database/oracle/oracle-data-access-components/ef-core/)
- [Bootstrap](https://getbootstrap.com/)

---
