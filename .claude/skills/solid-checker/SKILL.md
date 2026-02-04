---
name: solid-checker
description: Analyze and fix SOLID principle violations in software projects. Use when the user asks to check code quality, review architecture, find design smells, refactor for maintainability, or explicitly mentions SOLID, single responsibility, open-closed, Liskov, interface segregation, or dependency inversion. Triggers on "check SOLID", "review code design", "find code smells", "improve architecture", "refactor for maintainability", or any request about clean code principles.
---

# SOLID Checker

Analyze codebases for SOLID principle violations and provide actionable fixes.

## Workflow

```
1. Scan → Identify candidate files (classes, modules, components)
2. Analyze → Check each principle systematically
3. Report → List violations with severity and location
4. Fix → Provide refactoring suggestions with code examples
```

## Quick Reference

| Principle | Violation Sign | Mental Model |
|-----------|----------------|--------------|
| **S**ingle Responsibility | Class does AND (registration AND auth AND email) | One robot = one job |
| **O**pen-Closed | Adding features requires modifying existing code | Browser extensions (extend without modifying core) |
| **L**iskov Substitution | Subclass throws exceptions parent doesn't | Child must do everything parent can |
| **I**nterface Segregation | Class implements methods it doesn't use | Targeted exercise routines |
| **D**ependency Inversion | High-level depends directly on low-level details | Robot with socket adapter, not fused tools |

## Analysis Process

### 1. Single Responsibility Principle (SRP)

**Detection pattern:**
```
# Red flags in class/module names
UserManagerAndEmailSenderAndLogger  # Multiple ANDs = multiple responsibilities
RegistrationAndAuthenticationService  # Doing too much

# Red flags in method structure
class User:
    def save_to_db(self): ...      # Persistence
    def send_welcome_email(self): ...  # Communication
    def validate_password(self): ...   # Validation
    def generate_report(self): ...     # Reporting
```

**Fix approach:** Extract each responsibility into dedicated class:
```python
# Before: One class doing everything
class UserService:
    def register(self, data): ...
    def send_email(self, user): ...
    def save_to_db(self, user): ...

# After: Separated responsibilities
class UserRepository:
    def save(self, user): ...

class EmailService:
    def send_welcome(self, user): ...

class UserRegistration:
    def __init__(self, repo: UserRepository, email: EmailService):
        self.repo = repo
        self.email = email

    def register(self, data):
        user = User(data)
        self.repo.save(user)
        self.email.send_welcome(user)
```

### 2. Open-Closed Principle (OCP)

**Detection pattern:**
```python
# Red flag: if/elif chains for types
def process_payment(payment):
    if payment.type == "credit_card":
        validate_card_number(payment)
        check_antifraud(payment)
        charge_card(payment)
    elif payment.type == "boleto":
        generate_boleto(payment)
        # No antifraud for boleto
    elif payment.type == "pix":
        generate_pix_code(payment)
    # Adding new payment type = modifying this function
```

**Fix approach:** Use polymorphism/strategy pattern:
```python
# After: Closed for modification, open for extension
from abc import ABC, abstractmethod

class PaymentProcessor(ABC):
    @abstractmethod
    def validate(self): ...

    @abstractmethod
    def process(self): ...

class CreditCardProcessor(PaymentProcessor):
    def validate(self):
        self.validate_card_number()
        self.check_antifraud()

    def process(self):
        self.charge_card()

class BoletoProcessor(PaymentProcessor):
    def validate(self):
        self.validate_boleto_data()

    def process(self):
        self.generate_boleto()

# New payment types: just add new class, no modification needed
class PixProcessor(PaymentProcessor):
    def validate(self): ...
    def process(self): ...
```

### 3. Liskov Substitution Principle (LSP)

**Detection pattern:**
```python
# Red flag: Subclass that breaks parent contract
class Bird:
    def fly(self):
        return "flying"

class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("Penguins can't fly!")  # Violates LSP

# Red flag: Subclass that returns incompatible types
class Rectangle:
    def area(self) -> int:
        return self.width * self.height

class Square(Rectangle):
    def area(self) -> str:  # Wrong return type
        return f"Area: {self.side ** 2}"
```

**Fix approach:** Redesign hierarchy with correct abstractions:
```python
# After: Correct abstraction level
class Bird(ABC):
    @abstractmethod
    def move(self): ...

class FlyingBird(Bird):
    def move(self):
        return self.fly()

    def fly(self): ...

class SwimmingBird(Bird):
    def move(self):
        return self.swim()

    def swim(self): ...

class Eagle(FlyingBird): ...
class Penguin(SwimmingBird): ...
```

### 4. Interface Segregation Principle (ISP)

**Detection pattern:**
```python
# Red flag: Fat interface forcing unused implementations
class Worker(ABC):
    @abstractmethod
    def work(self): ...

    @abstractmethod
    def eat(self): ...

    @abstractmethod
    def sleep(self): ...

class Robot(Worker):
    def work(self): ...
    def eat(self): pass  # Robots don't eat - forced to implement
    def sleep(self): pass  # Robots don't sleep - forced to implement
```

**Fix approach:** Segregate into focused interfaces:
```python
# After: Segregated interfaces
class Workable(ABC):
    @abstractmethod
    def work(self): ...

class Eatable(ABC):
    @abstractmethod
    def eat(self): ...

class Sleepable(ABC):
    @abstractmethod
    def sleep(self): ...

class Human(Workable, Eatable, Sleepable):
    def work(self): ...
    def eat(self): ...
    def sleep(self): ...

class Robot(Workable):
    def work(self): ...  # Only implements what it needs
```

### 5. Dependency Inversion Principle (DIP)

**Detection pattern:**
```python
# Red flag: Direct instantiation of dependencies
class OrderService:
    def __init__(self):
        self.db = MySQLDatabase()  # Tightly coupled to MySQL
        self.email = SMTPEmailSender()  # Tightly coupled to SMTP

    def create_order(self, data):
        order = Order(data)
        self.db.save(order)  # Can't swap database
        self.email.send(order)  # Can't swap email provider
```

**Fix approach:** Depend on abstractions, inject dependencies:
```python
# After: Dependency inversion with injection
class Database(ABC):
    @abstractmethod
    def save(self, entity): ...

class EmailSender(ABC):
    @abstractmethod
    def send(self, message): ...

class OrderService:
    def __init__(self, db: Database, email: EmailSender):
        self.db = db  # Accepts any Database implementation
        self.email = email  # Accepts any EmailSender

    def create_order(self, data):
        order = Order(data)
        self.db.save(order)
        self.email.send(order)

# Usage: inject specific implementations
service = OrderService(
    db=PostgresDatabase(),
    email=SendGridEmailSender()
)
```

## Report Format

Generate reports in this structure:

```markdown
# SOLID Analysis Report

## Summary
- Files analyzed: X
- Violations found: Y
- Critical: Z | Warning: W | Info: I

## Violations

### [S] Single Responsibility
| File | Line | Issue | Severity |
|------|------|-------|----------|
| user_service.py | 15-89 | Class handles auth, email, and persistence | Critical |

### [O] Open-Closed
...

## Recommended Refactorings

### 1. Extract UserRepository from UserService
**Current:** user_service.py:45-60
**Action:** Move database operations to new UserRepository class
**Benefit:** UserService becomes focused, DB logic reusable
```

## Language-Specific Patterns

For detailed patterns by language, see [references/language-patterns.md](references/language-patterns.md):
- Python: ABC, Protocol, dataclasses
- TypeScript: interfaces, generics, dependency injection
- Java: interfaces, abstract classes, Spring DI
- Go: interfaces, composition
