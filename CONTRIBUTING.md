# Contributing to InnovateFund

First off, thank you for considering contributing to InnovateFund! It's people like you that make InnovateFund such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed and what you expected**
- **Include screenshots** if relevant
- **Include your environment details** (OS, browser, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful**
- **List some examples** of how it would be used

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
3. **Test your changes**
   - Ensure all existing tests pass
   - Add new tests if applicable
   - Test on different browsers/devices
4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference issues in commit messages when applicable
5. **Push to your fork** and submit a pull request
6. **Wait for review**

## Development Process

### Setting Up Your Development Environment

1. Clone your fork:

   ```bash
   git clone https://github.com/Niroop8305/InnovateFund.git
   cd InnovateFund
   ```

2. Install dependencies:

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. Set up environment variables (see README.md)

4. Start development servers:

   ```bash
   # Backend (in backend folder)
   npm run dev

   # Frontend (in frontend folder)
   npm run dev
   ```

### Coding Standards

#### JavaScript/React

- Use ES6+ features
- Follow functional programming principles
- Use meaningful variable and function names
- Keep functions small and focused
- Use async/await instead of promises where possible
- Add JSDoc comments for complex functions

#### File Organization

- One component per file
- Group related files in folders
- Use index.js for folder exports
- Keep components under 300 lines

#### Naming Conventions

- Components: PascalCase (e.g., `UserProfile.jsx`)
- Functions: camelCase (e.g., `handleSubmit`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- CSS classes: kebab-case (e.g., `user-profile-card`)

#### Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and pull requests liberally

Examples:

```
feat: Add user authentication
fix: Resolve chat notification bug
docs: Update API documentation
style: Format code according to style guide
refactor: Restructure user profile component
test: Add tests for chat functionality
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for at least 70% code coverage

### Documentation

- Update README.md if you change functionality
- Add JSDoc comments to functions
- Update API documentation if you modify endpoints
- Include examples in documentation

## Project Structure Guidelines

### Backend

```
backend/
Γö£ΓöÇΓöÇ config/         # Configuration files
Γö£ΓöÇΓöÇ controllers/    # Business logic
Γö£ΓöÇΓöÇ middleware/     # Express middleware
Γö£ΓöÇΓöÇ models/         # Database models
Γö£ΓöÇΓöÇ routes/         # API routes
Γö£ΓöÇΓöÇ utils/          # Helper functions
ΓööΓöÇΓöÇ server.js       # Entry point
```

### Frontend

```
frontend/
Γö£ΓöÇΓöÇ src/
Γöé   Γö£ΓöÇΓöÇ components/ # Reusable components
Γöé   Γö£ΓöÇΓöÇ context/    # React context
Γöé   Γö£ΓöÇΓöÇ pages/      # Page components
Γöé   Γö£ΓöÇΓöÇ services/   # API services
Γöé   ΓööΓöÇΓöÇ utils/      # Helper functions
```

## Questions?

Feel free to open an issue with the `question` label, or reach out to the maintainers directly.

## Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to InnovateFund! ≡ƒÜÇ
