import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Flex,
  VStack,
  Icon,
  Text,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
} from '@chakra-ui/react';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  BarChart3,
  Settings,
  Menu,
  Puzzle,
} from 'lucide-react';
import UserMenu from '../auth/UserMenu';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Decks', icon: Layers, path: '/decks' },
  { label: 'Flashcards', icon: BookOpen, path: '/flashcards' },
  { label: 'Statistics', icon: BarChart3, path: '/statistics' },
  { label: 'Add-Ons', icon: Puzzle, path: '/addons' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function NavContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const bgColor = 'white';
  const activeBg = 'blue.50';
  const activeColor = 'blue.600';
  const hoverBg = 'gray.100';
  const textColor = 'gray.600';
  const borderColor = 'gray.200';

  return (
    <Flex
      direction="column"
      h="full"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
    >
      {/* Logo */}
      <Flex align="center" p={6} gap={3}>
        <Box
          w={10}
          h={10}
          bg="blue.500"
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={BookOpen} color="white" boxSize={5} />
        </Box>
        <Box>
          <Text fontWeight="bold" fontSize="lg">
            Mnemo
          </Text>
          <Text fontSize="xs" color={textColor}>
            Spaced Repetition
          </Text>
        </Box>
      </Flex>

      {/* Navigation */}
      <VStack spacing={1} px={3} flex={1} align="stretch">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Flex
              key={item.path}
              align="center"
              gap={3}
              px={4}
              py={3}
              borderRadius="lg"
              cursor="pointer"
              bg={isActive ? activeBg : 'transparent'}
              color={isActive ? activeColor : textColor}
              fontWeight={isActive ? '600' : '500'}
              _hover={{ bg: isActive ? activeBg : hoverBg }}
              onClick={() => navigate(item.path)}
              transition="all 0.2s"
            >
              <Icon as={item.icon} boxSize={5} />
              <Text>{item.label}</Text>
            </Flex>
          );
        })}
      </VStack>

      {/* User Menu */}
      <Box borderTop="1px" borderColor={borderColor}>
        <UserMenu />
      </Box>
    </Flex>
  );
}

export default function Sidebar() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = 'white';

  return (
    <>
      {/* Mobile menu button */}
      <IconButton
        aria-label="Open menu"
        icon={<Icon as={Menu} />}
        position="fixed"
        top={4}
        left={4}
        zIndex={20}
        display={{ base: 'flex', md: 'none' }}
        onClick={onOpen}
        bg={bgColor}
        shadow="md"
      />

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="240px">
          <DrawerCloseButton />
          <DrawerBody p={0}>
            <NavContent />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Desktop sidebar */}
      <Box
        position="fixed"
        left={0}
        top={0}
        h="100vh"
        w="240px"
        display={{ base: 'none', md: 'block' }}
        zIndex={10}
      >
        <NavContent />
      </Box>
    </>
  );
}
