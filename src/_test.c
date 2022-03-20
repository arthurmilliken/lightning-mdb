#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

typedef enum DAYS_OF_WEEK
{
  SUNDAY, // 0
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY, // 6
} DAYS_OF_WEEK;

int main(int argc, char *argv[])
{
  uint32_t rc = 123;
  char *str = "Hello World";
  printf("str = %p\n", str);

  char *container = calloc(1, sizeof(rc) + sizeof(str) + 1);
  memcpy(container, &rc, sizeof(rc));
  memcpy(container, &str, sizeof(str));

  uint32_t rc2 = *(uint32_t *)container;
  printf("rc2 = %u\n", rc2);

  char *str2;
  memcpy(&str2, container, sizeof(str2));

  printf("str2 = %p\n", str2);
  printf("*str2 = %s\n", str2);

  double mynumber = 12;
  printf("mynumber = %.0f\n", mynumber);
  printf("strlen('\\0') = %ld\n", strlen("\0"));

  printf("SUNDAY = %d\n", SUNDAY);
  printf("SATURDAY = %d\n", SATURDAY);
  printf("THURSDAY == 4: %d\n", THURSDAY == 4);
  puts("done.");
}