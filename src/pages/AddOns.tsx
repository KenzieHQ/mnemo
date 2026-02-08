import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Button,
  HStack,
  VStack,
  Icon,
  Badge,
  Switch,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
} from '@chakra-ui/react';
import {
  Puzzle,
  Timer,
  Volume2,
  Keyboard,
  Calendar,
  Download,
  Settings as SettingsIcon,
} from 'lucide-react';

// Add-on settings stored in localStorage
export interface AddOnSettings {
  // Pomodoro settings
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  pomodoroAutoStart: boolean;
  // TTS settings
  ttsVoice: string;
  ttsRate: number;
  ttsAutoPlay: boolean;
  // Keyboard shortcuts
  keyboardShortcutsEnabled: boolean;
  // Heatmap
  heatmapEnabled: boolean;
}

export const DEFAULT_ADDON_SETTINGS: AddOnSettings = {
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  pomodoroAutoStart: false,
  ttsVoice: '',
  ttsRate: 1,
  ttsAutoPlay: false,
  keyboardShortcutsEnabled: true,
  heatmapEnabled: true,
};

// Get addon settings from localStorage
export function getAddOnSettings(): AddOnSettings {
  const stored = localStorage.getItem('mnemo-addon-settings');
  if (stored) {
    return { ...DEFAULT_ADDON_SETTINGS, ...JSON.parse(stored) };
  }
  return DEFAULT_ADDON_SETTINGS;
}

// Save addon settings to localStorage
export function saveAddOnSettings(settings: Partial<AddOnSettings>): AddOnSettings {
  const current = getAddOnSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('mnemo-addon-settings', JSON.stringify(updated));
  return updated;
}

// Get installed addons from localStorage
export function getInstalledAddOns(): Record<string, boolean> {
  const stored = localStorage.getItem('mnemo-addons-installed');
  if (stored) {
    return JSON.parse(stored);
  }
  return {};
}

// Save installed addons to localStorage
export function saveInstalledAddOns(addons: Record<string, boolean>): void {
  localStorage.setItem('mnemo-addons-installed', JSON.stringify(addons));
}

// Check if an addon is enabled
export function isAddOnEnabled(addonId: string): boolean {
  const installed = getInstalledAddOns();
  return installed[addonId] === true;
}

// Text-to-speech helper
export function speakText(text: string): void {
  if (!isAddOnEnabled('text-to-speech')) return;
  
  const settings = getAddOnSettings();
  const utterance = new SpeechSynthesisUtterance(text);
  
  if (settings.ttsVoice) {
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === settings.ttsVoice);
    if (voice) utterance.voice = voice;
  }
  
  utterance.rate = settings.ttsRate;
  speechSynthesis.cancel(); // Cancel any ongoing speech
  speechSynthesis.speak(utterance);
}

// Stop any ongoing speech
export function stopSpeaking(): void {
  speechSynthesis.cancel();
}

// Add-on interface
interface AddOn {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: React.ElementType;
  category: 'study' | 'accessibility' | 'analytics';
  tags: string[];
  hasSettings: boolean;
}

// Available add-ons - only functional ones
const AVAILABLE_ADDONS: AddOn[] = [
  {
    id: 'pomodoro-timer',
    name: 'Pomodoro Timer',
    description: 'Built-in focus timer with customizable work/break intervals',
    longDescription: 'Integrate the Pomodoro Technique into your study sessions. A timer appears during study showing your focus time. When the timer ends, you get a notification to take a break. Customize work duration (default 25 min) and break duration (default 5 min).',
    icon: Timer,
    category: 'study',
    tags: ['focus', 'productivity', 'timer'],
    hasSettings: true,
  },
  {
    id: 'text-to-speech',
    name: 'Text-to-Speech',
    description: 'Listen to your flashcards read aloud',
    longDescription: 'Have your flashcard content read aloud using your browser\'s built-in text-to-speech. Great for language learning, accessibility, or hands-free studying. Choose from available system voices and adjust speaking rate. Click the speaker icon on cards to hear them.',
    icon: Volume2,
    category: 'accessibility',
    tags: ['audio', 'accessibility', 'hands-free'],
    hasSettings: true,
  },
  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Navigate and review cards without using a mouse',
    longDescription: 'Use keyboard shortcuts during study sessions:\n• Space - Show answer / Rate Good\n• 1 - Again\n• 2 - Hard\n• 3 - Good\n• 4 - Easy\n• F - Toggle fullscreen\n• Esc - Exit fullscreen / Go back',
    icon: Keyboard,
    category: 'study',
    tags: ['productivity', 'shortcuts', 'accessibility'],
    hasSettings: false,
  },
  {
    id: 'study-heatmap',
    name: 'Study Heatmap',
    description: 'Visualize your study activity over time',
    longDescription: 'See a GitHub-style heatmap on your Statistics page showing your daily study activity. Darker colors indicate more cards reviewed. Great for tracking consistency and building study habits.',
    icon: Calendar,
    category: 'analytics',
    tags: ['visualization', 'activity', 'motivation'],
    hasSettings: false,
  },
];

export default function AddOns() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [selectedAddOn, setSelectedAddOn] = useState<AddOn | null>(null);
  const [installedAddOns, setInstalledAddOns] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<AddOnSettings>(DEFAULT_ADDON_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load installed add-ons and settings
  useEffect(() => {
    setInstalledAddOns(getInstalledAddOns());
    setSettings(getAddOnSettings());

    // Load available TTS voices
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleInstall = (addon: AddOn) => {
    const updated = { ...installedAddOns, [addon.id]: true };
    setInstalledAddOns(updated);
    saveInstalledAddOns(updated);
    toast({
      title: `${addon.name} enabled`,
      description: addon.hasSettings ? 'Click the settings icon to configure' : 'Add-on is now active',
      status: 'success',
      duration: 3000,
    });
  };

  const handleUninstall = (addon: AddOn) => {
    const updated = { ...installedAddOns };
    delete updated[addon.id];
    setInstalledAddOns(updated);
    saveInstalledAddOns(updated);
    toast({
      title: `${addon.name} disabled`,
      status: 'info',
      duration: 3000,
    });
  };

  const handleToggle = (addon: AddOn, enabled: boolean) => {
    const updated = { ...installedAddOns, [addon.id]: enabled };
    setInstalledAddOns(updated);
    saveInstalledAddOns(updated);
  };

  const openDetails = (addon: AddOn) => {
    setSelectedAddOn(addon);
    onOpen();
  };

  const openSettings = (addon: AddOn) => {
    setSelectedAddOn(addon);
    onSettingsOpen();
  };

  const handleSaveSettings = (newSettings: Partial<AddOnSettings>) => {
    const updated = saveAddOnSettings(newSettings);
    setSettings(updated);
    toast({
      title: 'Settings saved',
      status: 'success',
      duration: 2000,
    });
    onSettingsClose();
  };

  const testTTS = () => {
    const utterance = new SpeechSynthesisUtterance('This is a test of the text to speech feature.');
    if (settings.ttsVoice) {
      const voice = availableVoices.find(v => v.name === settings.ttsVoice);
      if (voice) utterance.voice = voice;
    }
    utterance.rate = settings.ttsRate;
    speechSynthesis.speak(utterance);
  };

  const cardBg = 'white';
  const borderColor = 'gray.200';
  const subtleText = 'gray.600';

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      study: 'blue',
      accessibility: 'orange',
      analytics: 'purple',
    };
    return colors[category] || 'gray';
  };

  const installedCount = Object.values(installedAddOns).filter(Boolean).length;

  return (
    <Box maxW="1200px" mx="auto">
      {/* Header */}
      <HStack mb={6} justify="space-between" flexWrap="wrap" gap={4}>
        <HStack>
          <Icon as={Puzzle} boxSize={6} color="blue.500" />
          <Heading size="lg">Add-Ons</Heading>
        </HStack>
        <Badge colorScheme="green" fontSize="sm" px={3} py={1} borderRadius="full">
          {installedCount} active
        </Badge>
      </HStack>

      <Text color={subtleText} mb={6}>
        Extend Mnemo with these add-ons to enhance your learning experience. All add-ons are free and functional.
      </Text>

      <Alert status="info" mb={6} borderRadius="md">
        <AlertIcon />
        <Text fontSize="sm">
          Add-ons integrate directly into your study sessions and other pages. Enable them here and they'll automatically appear where relevant.
        </Text>
      </Alert>

      {/* Add-ons Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {AVAILABLE_ADDONS.map((addon) => {
          const isInstalled = installedAddOns[addon.id] === true;

          return (
            <Card
              key={addon.id}
              bg={cardBg}
              borderColor={isInstalled ? `${getCategoryColor(addon.category)}.300` : borderColor}
              borderWidth={isInstalled ? '2px' : '1px'}
              _hover={{ shadow: 'md' }}
              transition="all 0.2s"
            >
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  {/* Header */}
                  <HStack justify="space-between">
                    <HStack spacing={3} cursor="pointer" onClick={() => openDetails(addon)}>
                      <Box
                        p={2}
                        bg={`${getCategoryColor(addon.category)}.100`}
                        borderRadius="lg"
                      >
                        <Icon
                          as={addon.icon}
                          boxSize={5}
                          color={`${getCategoryColor(addon.category)}.600`}
                        />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" fontSize="md">
                          {addon.name}
                        </Text>
                        <Badge colorScheme={getCategoryColor(addon.category)} fontSize="xs">
                          {addon.category}
                        </Badge>
                      </VStack>
                    </HStack>
                    {isInstalled && addon.hasSettings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openSettings(addon)}
                      >
                        <Icon as={SettingsIcon} />
                      </Button>
                    )}
                  </HStack>

                  {/* Description */}
                  <Text fontSize="sm" color={subtleText}>
                    {addon.description}
                  </Text>

                  {/* Tags */}
                  <Wrap spacing={1}>
                    {addon.tags.map((tag) => (
                      <WrapItem key={tag}>
                        <Tag size="sm" variant="subtle" colorScheme="gray">
                          <TagLabel>{tag}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>

                  <Divider />

                  {/* Actions */}
                  <HStack justify="space-between">
                    {isInstalled ? (
                      <>
                        <HStack>
                          <Switch
                            size="md"
                            isChecked={isInstalled}
                            onChange={(e) => handleToggle(addon, e.target.checked)}
                            colorScheme="green"
                          />
                          <Text fontSize="sm" color="green.600" fontWeight="medium">
                            Enabled
                          </Text>
                        </HStack>
                        <Button
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleUninstall(addon)}
                        >
                          Disable
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        leftIcon={<Icon as={Download} boxSize={4} />}
                        onClick={() => handleInstall(addon)}
                        w="full"
                      >
                        Enable Add-On
                      </Button>
                    )}
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          {selectedAddOn && (
            <>
              <ModalHeader>
                <HStack spacing={3}>
                  <Box
                    p={2}
                    bg={`${getCategoryColor(selectedAddOn.category)}.100`}
                    borderRadius="lg"
                  >
                    <Icon
                      as={selectedAddOn.icon}
                      boxSize={6}
                      color={`${getCategoryColor(selectedAddOn.category)}.600`}
                    />
                  </Box>
                  <Text>{selectedAddOn.name}</Text>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack align="stretch" spacing={4}>
                  <Text whiteSpace="pre-line">{selectedAddOn.longDescription}</Text>
                  
                  <Divider />
                  
                  <Box>
                    <Text fontWeight="medium" mb={2}>Tags</Text>
                    <Wrap>
                      {selectedAddOn.tags.map((tag) => (
                        <WrapItem key={tag}>
                          <Tag colorScheme="blue" variant="subtle">
                            <TagLabel>{tag}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="md">
        <ModalOverlay />
        <ModalContent>
          {selectedAddOn && (
            <>
              <ModalHeader>
                <HStack>
                  <Icon as={SettingsIcon} />
                  <Text>{selectedAddOn.name} Settings</Text>
                </HStack>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                {selectedAddOn.id === 'pomodoro-timer' && (
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Work Duration (minutes)</FormLabel>
                      <NumberInput
                        value={settings.pomodoroWorkMinutes}
                        onChange={(_, val) => setSettings({ ...settings, pomodoroWorkMinutes: val || 25 })}
                        min={5}
                        max={60}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Break Duration (minutes)</FormLabel>
                      <NumberInput
                        value={settings.pomodoroBreakMinutes}
                        onChange={(_, val) => setSettings({ ...settings, pomodoroBreakMinutes: val || 5 })}
                        min={1}
                        max={30}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </FormControl>

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb={0}>Auto-start timer</FormLabel>
                      <Switch
                        isChecked={settings.pomodoroAutoStart}
                        onChange={(e) => setSettings({ ...settings, pomodoroAutoStart: e.target.checked })}
                        colorScheme="blue"
                      />
                    </FormControl>
                  </VStack>
                )}

                {selectedAddOn.id === 'text-to-speech' && (
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Voice</FormLabel>
                      <Select
                        value={settings.ttsVoice}
                        onChange={(e) => setSettings({ ...settings, ttsVoice: e.target.value })}
                        placeholder="System default"
                      >
                        {availableVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Speaking Rate</FormLabel>
                      <Select
                        value={settings.ttsRate}
                        onChange={(e) => setSettings({ ...settings, ttsRate: parseFloat(e.target.value) })}
                      >
                        <option value={0.5}>Slow (0.5x)</option>
                        <option value={0.75}>Slower (0.75x)</option>
                        <option value={1}>Normal (1x)</option>
                        <option value={1.25}>Faster (1.25x)</option>
                        <option value={1.5}>Fast (1.5x)</option>
                      </Select>
                    </FormControl>

                    <FormControl display="flex" alignItems="center" justifyContent="space-between">
                      <FormLabel mb={0}>Auto-play on card flip</FormLabel>
                      <Switch
                        isChecked={settings.ttsAutoPlay}
                        onChange={(e) => setSettings({ ...settings, ttsAutoPlay: e.target.checked })}
                        colorScheme="blue"
                      />
                    </FormControl>

                    <Button onClick={testTTS} variant="outline" size="sm">
                      Test Voice
                    </Button>
                  </VStack>
                )}
              </ModalBody>
              <ModalFooter>
                <HStack>
                  <Button variant="ghost" onClick={onSettingsClose}>
                    Cancel
                  </Button>
                  <Button 
                    colorScheme="blue" 
                    onClick={() => handleSaveSettings(settings)}
                  >
                    Save Settings
                  </Button>
                </HStack>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
}
