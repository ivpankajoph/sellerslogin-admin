export const PASSWORD_REQUIREMENTS = [
  {
    key: 'length',
    label: 'Minimum 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    key: 'uppercase',
    label: 'At least 1 capital letter',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    key: 'number',
    label: 'At least 1 number',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    key: 'special',
    label: 'At least 1 special character',
    test: (password: string) => /[!@#$%^&*]/.test(password),
  },
] as const

export const isStrongPassword = (password: string) =>
  PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password))
