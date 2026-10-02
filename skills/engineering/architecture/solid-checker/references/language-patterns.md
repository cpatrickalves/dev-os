# Language-Specific SOLID Patterns

## Table of Contents
- [Python](#python)
- [TypeScript/JavaScript](#typescriptjavascript)
- [Java](#java)
- [Go](#go)
- [C#](#c)

---

## Python

### Abstractions
```python
from abc import ABC, abstractmethod
from typing import Protocol

# Option 1: ABC (explicit inheritance)
class Repository(ABC):
    @abstractmethod
    def save(self, entity): ...

    @abstractmethod
    def find(self, id): ...

# Option 2: Protocol (structural typing, duck typing)
class Sendable(Protocol):
    def send(self, message: str) -> bool: ...

# Any class with send(str) -> bool satisfies Sendable
```

### Dependency Injection
```python
# Manual injection
class Service:
    def __init__(self, repo: Repository, notifier: Sendable):
        self.repo = repo
        self.notifier = notifier

# With dependency-injector library
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    repo = providers.Singleton(PostgresRepository)
    notifier = providers.Factory(EmailNotifier)
    service = providers.Factory(Service, repo=repo, notifier=notifier)
```

### Interface Segregation
```python
# Use multiple Protocol/ABC classes
class Readable(Protocol):
    def read(self) -> bytes: ...

class Writable(Protocol):
    def write(self, data: bytes) -> None: ...

class ReadWritable(Readable, Writable):
    pass

# Function accepts only what it needs
def process(source: Readable) -> None:
    data = source.read()
    # ...
```

---

## TypeScript/JavaScript

### Abstractions
```typescript
// Interface (preferred for contracts)
interface Repository<T> {
    save(entity: T): Promise<void>;
    find(id: string): Promise<T | null>;
}

// Abstract class (when shared implementation needed)
abstract class BaseService {
    abstract process(): void;

    log(message: string): void {
        console.log(`[${this.constructor.name}] ${message}`);
    }
}
```

### Dependency Injection
```typescript
// Constructor injection
class OrderService {
    constructor(
        private readonly repo: Repository<Order>,
        private readonly notifier: Notifier
    ) {}
}

// With tsyringe
import { injectable, inject } from 'tsyringe';

@injectable()
class OrderService {
    constructor(
        @inject('Repository') private repo: Repository<Order>,
        @inject('Notifier') private notifier: Notifier
    ) {}
}
```

### Open-Closed with Generics
```typescript
// Generic processor - extend without modifying
interface Processor<T, R> {
    canProcess(input: unknown): input is T;
    process(input: T): R;
}

class ProcessorRegistry {
    private processors: Processor<unknown, unknown>[] = [];

    register(processor: Processor<unknown, unknown>): void {
        this.processors.push(processor);
    }

    process<T>(input: T): unknown {
        const processor = this.processors.find(p => p.canProcess(input));
        if (!processor) throw new Error('No processor found');
        return processor.process(input);
    }
}
```

---

## Java

### Abstractions
```java
// Interface (preferred)
public interface Repository<T> {
    void save(T entity);
    Optional<T> find(String id);
}

// Abstract class (shared implementation)
public abstract class AbstractService {
    protected final Logger logger = LoggerFactory.getLogger(getClass());

    public abstract void execute();

    protected void logStart() {
        logger.info("Starting {}", getClass().getSimpleName());
    }
}
```

### Dependency Injection (Spring)
```java
@Service
public class OrderService {
    private final Repository<Order> repository;
    private final NotificationService notifier;

    // Constructor injection (preferred)
    public OrderService(
            Repository<Order> repository,
            NotificationService notifier) {
        this.repository = repository;
        this.notifier = notifier;
    }
}

// Configuration
@Configuration
public class AppConfig {
    @Bean
    public Repository<Order> orderRepository() {
        return new JpaOrderRepository();
    }
}
```

### Interface Segregation
```java
// Segregated interfaces
public interface Readable {
    byte[] read();
}

public interface Writable {
    void write(byte[] data);
}

public interface ReadWritable extends Readable, Writable {}

// Client depends only on what it needs
public class DataProcessor {
    public void process(Readable source) {
        byte[] data = source.read();
        // ...
    }
}
```

---

## Go

### Abstractions (Implicit Interfaces)
```go
// Interfaces are implicitly satisfied
type Repository interface {
    Save(entity interface{}) error
    Find(id string) (interface{}, error)
}

type Notifier interface {
    Send(message string) error
}

// Any struct with these methods satisfies the interface
type PostgresRepo struct{}

func (r *PostgresRepo) Save(entity interface{}) error { /* ... */ return nil }
func (r *PostgresRepo) Find(id string) (interface{}, error) { /* ... */ return nil, nil }
```

### Dependency Injection (Composition)
```go
type OrderService struct {
    repo     Repository
    notifier Notifier
}

func NewOrderService(repo Repository, notifier Notifier) *OrderService {
    return &OrderService{
        repo:     repo,
        notifier: notifier,
    }
}

func (s *OrderService) CreateOrder(data OrderData) error {
    // Use injected dependencies
    if err := s.repo.Save(data); err != nil {
        return err
    }
    return s.notifier.Send("Order created")
}
```

### Interface Segregation
```go
// Small, focused interfaces
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}

// Accept minimal interface
func Process(r Reader) error {
    buf := make([]byte, 1024)
    _, err := r.Read(buf)
    return err
}
```

---

## C#

### Abstractions
```csharp
// Interface
public interface IRepository<T>
{
    Task SaveAsync(T entity);
    Task<T?> FindAsync(string id);
}

// Abstract class
public abstract class BaseService
{
    protected readonly ILogger Logger;

    protected BaseService(ILogger logger)
    {
        Logger = logger;
    }

    public abstract Task ExecuteAsync();
}
```

### Dependency Injection (.NET Core)
```csharp
public class OrderService
{
    private readonly IRepository<Order> _repository;
    private readonly INotifier _notifier;

    public OrderService(IRepository<Order> repository, INotifier notifier)
    {
        _repository = repository;
        _notifier = notifier;
    }
}

// Startup.cs / Program.cs
services.AddScoped<IRepository<Order>, SqlOrderRepository>();
services.AddScoped<INotifier, EmailNotifier>();
services.AddScoped<OrderService>();
```

### Open-Closed with Strategy
```csharp
public interface IPaymentStrategy
{
    Task<PaymentResult> ProcessAsync(Payment payment);
}

public class PaymentProcessor
{
    private readonly IEnumerable<IPaymentStrategy> _strategies;

    public PaymentProcessor(IEnumerable<IPaymentStrategy> strategies)
    {
        _strategies = strategies;
    }

    public async Task<PaymentResult> ProcessAsync(Payment payment)
    {
        var strategy = _strategies.FirstOrDefault(s => s.CanHandle(payment));
        if (strategy == null)
            throw new NotSupportedException($"No handler for {payment.Type}");
        return await strategy.ProcessAsync(payment);
    }
}
```

---

## Common Code Smells by Principle

| Principle | Python | TypeScript | Java | Go |
|-----------|--------|------------|------|-----|
| SRP | God class with 10+ methods | Component with multiple `useEffect` | `*Manager` classes | Struct with 20+ methods |
| OCP | `if isinstance()` chains | `switch` on type discriminator | `instanceof` cascades | Type switch statements |
| LSP | `raise NotImplementedError` | Throwing in overridden methods | `@Override` that narrows | Embedded struct overriding |
| ISP | ABC with 10+ abstract methods | Interface with 10+ properties | Marker interfaces | Large interfaces |
| DIP | `import` concrete class in `__init__` | `new ConcreteClass()` in constructor | `new` in constructor | Direct struct instantiation |
