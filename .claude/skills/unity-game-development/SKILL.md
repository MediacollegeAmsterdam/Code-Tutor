---
name: unity-game-development
description: Helps with creating more professional code that holds strictly to modern coding conventions for the unity game engine in c#
---

This skill guides creating better structured, more readable, and more professional code for the unity game engine in C#. Implement real working classes without placeholder code, comments, or sections except if EXPLICITLY stated by the user.

READ THE COMPLETE SKILL FILE BEFORE CONTINUING

# Code Conventions
S
## How do you choose a name?

### Classes

| Code                     | Convention                                                           |
| ------------------------ | -------------------------------------------------------------------- |
| `public class Enemy`     | Class names are always in English and start with a capital letter    |
| `public class EnemyShip` | If a class name consists of multiple words, use **PascalCase**       |
| `public class EnemyShip` | A class is always an **object** (e.g. Weapon, Table, TargetFollower) |

---

### Variables

| Code                                           | Convention                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `private int _speed`                           | Variable names are always in English and start with an underscore followed by a lowercase letter |
| `private int _scrollSpeed`                     | If a variable name has multiple words, use **camelCase**                                         |
| `[SerializeField] private int scrollSpeed`     | Private serialized fields do **not** use an underscore                                           |
| `public const string HowToPlay = "howToPlay";` | Constants use **PascalCase** and start with a capital letter                                     |
| `public int Speed { get; } = 5;`               | Properties (getters/setters) start with a capital letter                                         |

---

### Functions / Methods

| Code         | Convention                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `Run();`     | Method names are always in English and start with a capital letter (in C#) |
| `RunFast();` | Multiple-word method names use **PascalCase**                              |
| `Shoot();`   | Method names are **verbs**: Shoot, Drive, Walk, Run, FollowTarget, etc.    |

---

### Enums

| Code                     | Convention                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `public enum BlendTypes` | Enum names are always in English and start with a capital letter                                 |
| `public enum BlendTypes` | Multiple-word enum names use **PascalCase**                                                      |
| `ForceIds`               | Enum names clearly indicate they represent a collection of *types* (EnemyTypes, WeaponIds, etc.) |

---

### Namespaces

| Code                     | Convention                                                            |
| ------------------------ | --------------------------------------------------------------------- |
| `namespace StateMachine` | Namespace names are always in English and start with a capital letter |
| `namespace StateMachine` | Multiple-word namespaces use **PascalCase**                           |

---

### Base Classes

| Code                  | Convention                                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| `public class Weapon` | A base class is named after the base object (weapon, bullet, state, menu, etc.) |

---

## Class Organization

Below is the recommended order for structuring your classes. This improves readability.

### 1. Class Variables (Fields)

* **Public variables**

  * Preferably avoid public fields for good encapsulation
* **Serialized private variables**

  * Editable in the Unity Editor
* **Private variables**

  * Internal state variables

### 2. Properties (Getters/Setters)

* Public properties that provide controlled access to variables

### 3. Unity Lifecycle Methods

Order them as Unity calls them:

* `Awake()`
* `Start()`
* `Update()`
* Others (`FixedUpdate`, `LateUpdate`, etc.)

### 4. Public Methods

* Methods that can be called by other classes

### 5. Interface Implementations

* Implementations of interface methods

### 6. Protected Methods

* Accessible within the class and subclasses

### 7. Private Methods

* Internal helper methods

### 8. Static Methods and Variables

* Grouped by access level (public, protected, private)

### 9. Coroutines

* Group `IEnumerator` methods (public, protected, private)

---

## Additional Guidelines

* **Consistency**: Be consistent throughout the project
* **Readability**: Prioritize readable and maintainable code
* **Refactoring**: Split large classes into smaller focused components

---

## Declarations (Creating Variables)

### Placement

Declare variables only at the beginning of a block. Do not wait until you need them.

```csharp
public void MyMethod()
{
    int int1;      // beginning of method block
    if (condition)
    {
        int int2;  // beginning of "if" block
    }
}
```

---

### Use of `var`

Use `var` when the type is clear from the right-hand side.

```csharp
var name = "OperationStarfall";
var strength = 255;
```

---

### One Declaration Per Line

**Good example:**

```csharp
var level = 5;
var size = 3;
```

---

### Use References

Use local variables as references to complex object names to improve readability and reduce errors.

**Bad example:**

```csharp
int l = gameTower[i].bullet.Count;
for (int i = 0; i < l; i++)
{
    if (gameTower[i].bullet[j].position.x > stageWidth ||
        gameTower[i].bullet[j].position.y > stageHeight)
    {
        Destroy(gameTower[i].bullet[j].gameObject);
    }
}
```

**Good example:**

```csharp
Bullet currentBullet;
int l = gameTower[i].bullet.Count;

for (int i = 0; i < l; i++)
{
    currentBullet = gameTower[i].bullet[j];
    if (currentBullet.position.x > stageWidth ||
        currentBullet.position.y > stageHeight)
    {
        Destroy(currentBullet.gameObject);
    }
}
```

---

### Ternary Operator

Use a ternary operator to write an `if/else` on one line.

**Bad example:**

```csharp
Color targetColor;
if (isSelected)
{
    targetColor = Color.red;
}
else
{
    targetColor = Color.white;
}
```

**Good example:**

```csharp
var targetColor = isSelected ? Color.red : Color.white;
```

---

## Statement Structure

### If / Else Statements

Always use braces `{}` except if making a guard clause.

```csharp
if (condition)
{
    statements;
}
else if (condition)
{
    statements;
}
else
{
    statements;
}
```

Always try to invert if statements to create guard clauses where possible.

Bad example:
```csharp
public void DoStuff()
{
    if(condition)
    {
        DoMoreStuff();
    }
}
```

Good example:
```csharp
{
    if(!condition) return;

    DoMoreStuff();
}
```

Guard clauses make code more readable by minimizing the 'mental' load on the reader
Guard clauses also help with minimizing indentation, which plays an important factor in code smell and readability

Always exclude else statements where not needed.

```csharp
if(a)
{
    DoA();
}
else
{
    DoB();
}
```

Instead, do this:

```csharp
if(a)
{
    DoA();
    return; // return so it still functions like an if-else
}

DoB();
```

This is only possible if there is no more logic in the method, it would not work in this example:

```csharp
if(a)
{
    DoA();
}
else
{
    DoB();
}

DoC();
```

---

### For Statements

```csharp
for (initialization; condition; update)
{
    statements;
}
```

**Good practice:**
Store collection length in a local variable.

```csharp
int l = bullets.Count;
for (int i = 0; i < l; i++)
{
    statements;
}
```

---

### Break Early

Always use `break;` once you find what you’re looking for.

```csharp
int l = names.Count;
for (int i = 0; i < l; i++)
{
    if (names[i] == searchValue)
    {
        break;
    }
}
```

---

# General Best Practices

### Use Prefixes

Use descriptive prefixes like `currentSpeed`, `targetEnemy`, `newBullet`.

```csharp
Enemy newEnemy = Instantiate(enemyPrefab);
```

---

### DRY – Don’t Repeat Yourself

Avoid duplicate code.

**Bad example:**

```csharp
if (randomNumber == 0)
{
    tower0.Aim(mouseX, mouseY);
    tower0.Shoot();
}
else if (randomNumber == 1)
{
    tower1.Aim(mouseX, mouseY);
    tower1.Shoot();
}
```

**Good example:**

```csharp
Tower shootingTower = towers[randomNumber];
shootingTower.Aim(mouseX, mouseY);
shootingTower.Shoot();
```

---

### Everything Is Private by Default

* Variables are **always private**
* Use getters/setters for access
* Methods are private unless explicitly needed

This creates a clean API and prevents unwanted access.

---

### Single Responsibility Principle (SRP)

Each class has **one responsibility**.

**Bad example:**

* `Player.cs`: movement, shooting, input

**Good example:**

* `PlayerMovement.cs`: movement
* `KeyboardInput.cs`: input handling

---

### Code Intent

Your code’s intent should be clear immediately.

**Bad example:**
You must read everything to understand what it does.

**Good example:**
Logic is split into clearly named methods that explain intent.

```csharp
public void Update()
{
    if (EnemiesLeft())
    {
        UpdateEnemies();
    }
}
```

Clear, readable, expressive code.

---

### Best Practice: Configurability

Make values configurable through the Unity Editor:

* Speeds
* Strengths
* Strings
* Tags

This makes code flexible and reusable.

---

### Open/Closed Principle

Code should be:

* **Open for extension**
* **Closed for modification**

Use inheritance, interfaces, and dictionaries.

**Bad example (hardcoded behavior):**

```csharp
if (newItem == "weapon")
{
}
else if (newItem == "map")
{
}
```

This must be changed every time a new type is added.

---

## Comments

Sparingly use comments, if intent is clear like the coding conventions said above, do not use comments at all.
Only use comment IN a method if lines of code are too complex to explain themselves.
Do NOT put comments above a method's declaration, if you need a comment to explain a method, the code is not good in the first place.
Do NOT put comments above groups of variables, instead, use a [Header("")] for that so it's readable for the user in-editor as well.