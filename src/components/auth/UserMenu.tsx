import React, { useState } from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
  Avatar,
  HStack,
  VStack,
  Text,
  Icon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
  Badge,
} from '@chakra-ui/react';
import {
  LogOut,
  Settings,
  Cloud,
  CloudOff,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseSync } from '../../hooks/useSupabaseSync';

export const UserMenu: React.FC = () => {
  const { user, signOut, deleteAccount, isConfigured } = useAuth();
  const { isSyncing, isOnline, fullSync, lastSyncTime } = useSupabaseSync();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const bgColor = 'white';
  const borderColor = 'gray.200';
  const mutedColor = 'gray.600';

  if (!isConfigured || !user) {
    return (
      <HStack spacing={3} px={4} py={4}>
        <Avatar size="sm" name="Guest" bg="gray.400" />
        <VStack align="start" spacing={0} flex={1}>
          <Text fontSize="sm" fontWeight="medium">
            Offline Mode
          </Text>
          <HStack spacing={1}>
            <Icon as={CloudOff} boxSize={3} color="gray.400" />
            <Text fontSize="xs" color={mutedColor}>
              Local storage only
            </Text>
          </HStack>
        </VStack>
      </HStack>
    );
  }

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSync = async () => {
    await fullSync();
    toast({
      title: 'Sync complete',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    if (error) {
      toast({
        title: 'Error deleting account',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Account deleted',
        description: 'Your account and all data have been removed.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
    setIsDeleting(false);
    onClose();
  };

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const email = user.email || '';

  return (
    <>
      <Menu>
        <MenuButton
          as={Button}
          variant="ghost"
          w="full"
          h="auto"
          px={4}
          py={4}
          justifyContent="flex-start"
          _hover={{ bg: 'gray.100' }}
        >
          <HStack spacing={3} w="full">
            <Avatar size="sm" name={displayName} bg="blue.500" />
            <VStack align="start" spacing={0.5} flex={1} display={{ base: 'none', md: 'flex' }}>
              <Text fontSize="sm" fontWeight="semibold" noOfLines={1} textAlign="left">
                {displayName}
              </Text>
              <HStack spacing={1.5}>
                <Icon
                  as={isOnline ? Cloud : CloudOff}
                  boxSize={3}
                  color={isOnline ? 'green.500' : 'orange.400'}
                />
                <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                  {isOnline ? 'Synced' : 'Offline'}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </MenuButton>

        <MenuList
          bg={bgColor}
          borderColor={borderColor}
          shadow="lg"
          py={2}
        >
          <VStack px={4} py={2} align="start" spacing={1}>
            <Text fontWeight="medium">{displayName}</Text>
            <Text fontSize="sm" color={mutedColor}>{email}</Text>
            {lastSyncTime && (
              <Text fontSize="xs" color={mutedColor}>
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </Text>
            )}
          </VStack>

          <MenuDivider />

          <MenuItem
            icon={<Icon as={RefreshCw} boxSize={4} className={isSyncing ? 'animate-spin' : ''} />}
            onClick={handleSync}
            isDisabled={!isOnline || isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
            {!isOnline && (
              <Badge ml={2} colorScheme="yellow" fontSize="xs">
                Offline
              </Badge>
            )}
          </MenuItem>

          <MenuItem
            icon={<Icon as={Settings} boxSize={4} />}
            as="a"
            href="/settings"
          >
            Settings
          </MenuItem>

          <MenuDivider />

          <MenuItem
            icon={<Icon as={LogOut} boxSize={4} />}
            onClick={handleSignOut}
          >
            Sign Out
          </MenuItem>

          <MenuItem
            icon={<Icon as={Trash2} boxSize={4} />}
            color="red.500"
            onClick={onOpen}
          >
            Delete Account
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Delete Account Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Account</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete your account? This action cannot be undone.
              All your decks, cards, and learning progress will be permanently deleted.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
              loadingText="Deleting..."
            >
              Delete Account
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UserMenu;
