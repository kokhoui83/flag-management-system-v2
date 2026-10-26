# Development Guidelines

## Test-Driven and Behavior-Driven Development

- Follow strict TDD: write a test that fails for the intended behavior before writing or changing production code; make it pass with the smallest change, then refactor while keeping tests green.
- Express requirements as observable behavior. Use clear Given/When/Then scenarios where they help describe user-facing or business behavior.
- Cover normal cases, relevant edge cases, and failure paths. Keep tests focused, deterministic, and independent.
- Run the relevant tests after each change and the broader available test suite before completing the work. Do not claim validation that was not performed.

## Clean Code

- Prefer clear, descriptive names and small, cohesive functions and modules.
- Keep logic straightforward; avoid duplication, unnecessary abstraction, hidden side effects, and unrelated changes.
- Follow the repository's established language, formatting, and error-handling conventions.
- Handle invalid input and failures explicitly. Do not silently swallow errors or return success-shaped fallbacks.

## Clean Architecture

- Keep responsibilities cohesive and dependencies directed toward stable domain concepts.
- Separate domain rules from delivery mechanisms and infrastructure where the project structure supports it.
- Depend on abstractions at boundaries when doing so improves testability or isolates change; avoid abstractions without a concrete need.
- Keep framework, persistence, and external-service concerns from leaking into core business logic.

## Software Development Practices

- Inspect relevant existing code and tests before making changes; reuse established patterns and helpers.
- Make the smallest complete change that satisfies the requirement, preserving existing behavior unless a change is intentional.
- Maintain type safety and use existing build, lint, and test tooling. Fix issues introduced by the change, not unrelated pre-existing issues.
- Review the final diff for correctness, scope, and unintended changes before finishing.

## Documentation

- Treat documentation as part of development: update relevant documentation whenever behavior, interfaces, setup, or workflows change.
- Keep documentation accurate, concise, and consistent with the implementation.
- Document non-obvious decisions and user-visible behavior; avoid comments that merely restate the code.
- Use Mermaid for all diagrams in documentation (architecture, data flow, sequences, state); do not draw diagrams as ASCII art. File trees, tabular data, and literal command/code output may stay as plain text or code blocks.
