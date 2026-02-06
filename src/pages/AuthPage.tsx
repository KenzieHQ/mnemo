import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Stack,
  Text,
  Icon,
  VStack,
  HStack,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { Eye, EyeOff, Mail, User, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'magic-link';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signIn, signUp, signInWithMagicLink, resetPassword, isConfigured } = useAuth();

  const bgColor = 'white';
  const borderColor = 'gray.200';
  const mutedColor = 'gray.600';

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if ((mode === 'login' || mode === 'signup') && !validatePassword(password)) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      switch (mode) {
        case 'login': {
          const { error } = await signIn(email, password);
          if (error) {
            setError(error.message);
          }
          break;
        }
        case 'signup': {
          const { error } = await signUp(email, password, displayName);
          if (error) {
            setError(error.message);
          } else {
            setSuccessMessage('Account created! Please check your email to verify your account.');
          }
          break;
        }
        case 'magic-link': {
          const { error } = await signInWithMagicLink(email);
          if (error) {
            setError(error.message);
          } else {
            setSuccessMessage('Magic link sent! Check your email to sign in.');
          }
          break;
        }
        case 'forgot-password': {
          const { error } = await resetPassword(email);
          if (error) {
            setError(error.message);
          } else {
            setSuccessMessage('Password reset email sent! Check your inbox.');
          }
          break;
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <Container maxW="md" py={12}>
        <VStack spacing={6} textAlign="center">
          <Icon as={Sparkles} boxSize={12} color="blue.500" />
          <Heading size="lg">Cloud Sync Not Configured</Heading>
          <Text color={mutedColor}>
            Supabase credentials are not set up. The app is running in offline-only mode.
            Your data is stored locally on this device.
          </Text>
          <Text color={mutedColor} fontSize="sm">
            To enable cloud sync and authentication, add your Supabase credentials to the .env.local file.
          </Text>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={12}>
      <VStack spacing={8}>
        {/* Logo and Title */}
        <VStack spacing={2} textAlign="center">
          <HStack spacing={2}>
            <Icon as={Sparkles} boxSize={8} color="blue.500" />
            <Heading size="xl" fontWeight="bold">
              Mnemo
            </Heading>
          </HStack>
          <Text color={mutedColor}>
            {mode === 'login' && 'Welcome back! Sign in to continue learning.'}
            {mode === 'signup' && 'Create an account to start your learning journey.'}
            {mode === 'magic-link' && 'Sign in without a password.'}
            {mode === 'forgot-password' && 'Reset your password.'}
          </Text>
        </VStack>

        {/* Auth Form */}
        <Box
          w="full"
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="xl"
          p={8}
          shadow="sm"
        >
          <form onSubmit={handleSubmit}>
            <Stack spacing={5}>
              {error && (
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              {successMessage && (
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  {successMessage}
                </Alert>
              )}

              {mode === 'signup' && (
                <FormControl>
                  <FormLabel>Display Name</FormLabel>
                  <InputGroup>
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      size="lg"
                    />
                    <InputRightElement h="full">
                      <Icon as={User} color="gray.400" />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              )}

              <FormControl isInvalid={!!error && !validateEmail(email)}>
                <FormLabel>Email</FormLabel>
                <InputGroup>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="lg"
                  />
                  <InputRightElement h="full">
                    <Icon as={Mail} color="gray.400" />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>Please enter a valid email</FormErrorMessage>
              </FormControl>

              {(mode === 'login' || mode === 'signup') && (
                <FormControl isInvalid={!!error && !validatePassword(password)}>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      size="lg"
                    />
                    <InputRightElement h="full">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        icon={<Icon as={showPassword ? EyeOff : Eye} />}
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>Password must be at least 8 characters</FormErrorMessage>
                </FormControl>
              )}

              {mode === 'login' && (
                <Link
                  color="blue.500"
                  fontSize="sm"
                  onClick={() => {
                    setMode('forgot-password');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  cursor="pointer"
                >
                  Forgot password?
                </Link>
              )}

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                isLoading={isLoading}
                loadingText={
                  mode === 'login'
                    ? 'Signing in...'
                    : mode === 'signup'
                    ? 'Creating account...'
                    : 'Sending...'
                }
              >
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'magic-link' && 'Send Magic Link'}
                {mode === 'forgot-password' && 'Send Reset Link'}
              </Button>

              {(mode === 'login' || mode === 'signup') && (
                <>
                  <Divider />
                  <Button
                    variant="outline"
                    size="lg"
                    leftIcon={<Icon as={Mail} />}
                    onClick={() => {
                      setMode('magic-link');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                  >
                    Continue with Magic Link
                  </Button>
                </>
              )}
            </Stack>
          </form>
        </Box>

        {/* Switch Mode Links */}
        <Text color={mutedColor} fontSize="sm">
          {mode === 'login' && (
            <>
              Don't have an account?{' '}
              <Link
                color="blue.500"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMessage(null);
                }}
                cursor="pointer"
              >
                Sign up
              </Link>
            </>
          )}
          {mode === 'signup' && (
            <>
              Already have an account?{' '}
              <Link
                color="blue.500"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                cursor="pointer"
              >
                Sign in
              </Link>
            </>
          )}
          {(mode === 'magic-link' || mode === 'forgot-password') && (
            <Link
              color="blue.500"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              cursor="pointer"
            >
              Back to sign in
            </Link>
          )}
        </Text>
      </VStack>
    </Container>
  );
};

export default AuthPage;
