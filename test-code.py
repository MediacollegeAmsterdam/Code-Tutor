def fibonacci(n):
    """Calculate fibonacci numbers up to n."""
    a, b = 0, 1
    while a < n:
        print(a, end=' ')
        a, b = b, a + b
    print()

# Example usage
if __name__ == "__main__":
    fibonacci(100)