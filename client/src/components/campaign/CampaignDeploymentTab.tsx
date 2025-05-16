import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Campaign } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Copy,
  Share2,
  Check,
  Loader2,
  Users,
  Lock,
  Globe,
  ShieldAlert,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface CampaignDeploymentTabProps {
  campaign: Campaign;
  isCreator: boolean;
}

export default function CampaignDeploymentTab({ campaign, isCreator }: CampaignDeploymentTabProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);
  const [isPrivate, setIsPrivate] = useState(campaign.isPrivate ?? true);
  const [maxPlayers, setMaxPlayers] = useState(campaign.maxPlayers ?? 6);
  const [deploymentCode, setDeploymentCode] = useState(campaign.deploymentCode || '');
  
  // Reset deployment state when campaign changes
  useEffect(() => {
    setIsPrivate(campaign.isPrivate ?? true);
    setMaxPlayers(campaign.maxPlayers ?? 6);
    setDeploymentCode(campaign.deploymentCode || '');
  }, [campaign]);
  
  // Publish campaign mutation
  const publishCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/campaigns/${campaign.id}/publish`, {
        isPrivate,
        maxPlayers
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      
      toast({
        title: "Campaign published",
        description: "Your campaign is now available to players."
      });
      
      // Update local state with new deployment code if available
      if (data.deploymentCode) {
        setDeploymentCode(data.deploymentCode);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to publish campaign",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Unpublish campaign mutation
  const unpublishCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/campaigns/${campaign.id}/unpublish`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      
      toast({
        title: "Campaign unpublished",
        description: "Your campaign is no longer available to new players."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unpublish campaign",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Update deployment settings mutation
  const updateDeploymentSettingsMutation = useMutation({
    mutationFn: async (updates: { isPrivate?: boolean; maxPlayers?: number }) => {
      const res = await apiRequest('PATCH', `/api/campaigns/${campaign.id}/deployment-settings`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}`] });
      
      toast({
        title: "Settings updated",
        description: "Campaign deployment settings have been updated."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Generate new deployment code mutation
  const generateNewCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/campaigns/${campaign.id}/generate-code`);
      return await res.json();
    },
    onSuccess: (data) => {
      setDeploymentCode(data.deploymentCode);
      
      toast({
        title: "New code generated",
        description: "Your campaign has a new join code."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate new code",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Handle copy join link to clipboard
  const copyJoinLink = () => {
    const baseUrl = window.location.origin;
    const joinUrl = `${baseUrl}/join-campaign?code=${deploymentCode}`;
    
    navigator.clipboard.writeText(joinUrl)
      .then(() => {
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
        
        toast({
          title: "Link copied!",
          description: "Campaign join link copied to clipboard."
        });
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard.",
          variant: "destructive"
        });
      });
  };
  
  // Handle privacy setting change
  const handlePrivacyChange = (checked: boolean) => {
    setIsPrivate(checked);
    updateDeploymentSettingsMutation.mutate({ isPrivate: checked });
  };
  
  // Handle max players change
  const handleMaxPlayersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1) {
      setMaxPlayers(value);
    }
  };
  
  // Handle max players update when blurring the input
  const handleMaxPlayersBlur = () => {
    updateDeploymentSettingsMutation.mutate({ maxPlayers });
  };
  
  // Show different content for DM vs player
  if (!isCreator) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-fantasy text-primary">Campaign Access</h2>
        
        <p className="text-muted-foreground">
          Only the Dungeon Master can manage campaign deployment settings.
        </p>
        
        {campaign.isPublished ? (
          <div className="p-4 bg-primary/10 rounded-md">
            <p>This campaign is currently published and available to players.</p>
            
            {campaign.isPrivate ? (
              <p className="mt-2 text-sm flex items-center">
                <Lock className="h-4 w-4 mr-1.5" />
                This is a private campaign that requires a join code.
              </p>
            ) : (
              <p className="mt-2 text-sm flex items-center">
                <Globe className="h-4 w-4 mr-1.5" />
                This is a public campaign that anyone can join.
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-md">
            <p>This campaign is not currently published to other players.</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold font-fantasy text-primary">Campaign Deployment</h2>
          <p className="text-muted-foreground">
            Publish your campaign so that other players can join and participate.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={campaign.isPublished ? "destructive" : "default"}
            onClick={() => campaign.isPublished 
              ? unpublishCampaignMutation.mutate() 
              : publishCampaignMutation.mutate()
            }
            disabled={publishCampaignMutation.isPending || unpublishCampaignMutation.isPending}
          >
            {(publishCampaignMutation.isPending || unpublishCampaignMutation.isPending) ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {campaign.isPublished ? "Unpublishing..." : "Publishing..."}
              </span>
            ) : (
              <span className="flex items-center">
                <Share2 className="h-4 w-4 mr-2" />
                {campaign.isPublished ? "Unpublish Campaign" : "Publish Campaign"}
              </span>
            )}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="settings">Deployment Settings</TabsTrigger>
          <TabsTrigger value="share">Share Campaign</TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium">Privacy Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Control who can access your campaign
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Label htmlFor="private-toggle" className="cursor-pointer">
                    {isPrivate ? 'Private' : 'Public'}
                  </Label>
                  <Switch
                    id="private-toggle"
                    checked={isPrivate}
                    onCheckedChange={handlePrivacyChange}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                {isPrivate ? (
                  <div className="flex items-start space-x-2">
                    <Lock className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <h4 className="font-medium">Private Campaign</h4>
                      <p className="text-sm text-muted-foreground">
                        Players will need your unique campaign code to join. This provides
                        more control over who can participate in your adventure.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <Globe className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <h4 className="font-medium">Public Campaign</h4>
                      <p className="text-sm text-muted-foreground">
                        Anyone can discover and join your campaign without a code.
                        Your campaign will appear in the public campaigns list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Player Capacity</h3>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div className="w-20">
                    <Input 
                      type="number" 
                      min="1"
                      max="20"
                      value={maxPlayers}
                      onChange={handleMaxPlayersChange}
                      onBlur={handleMaxPlayersBlur}
                      className="w-full"
                    />
                  </div>
                  <span className="text-muted-foreground">Maximum players allowed</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {campaign.isPublished && (
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to generate a new code? This will invalidate the current join code.")) {
                        generateNewCodeMutation.mutate();
                      }
                    }}
                    disabled={generateNewCodeMutation.isPending}
                  >
                    {generateNewCodeMutation.isPending ? (
                      <span className="flex items-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <ShieldAlert className="h-4 w-4 mr-2" />
                        Generate New Code
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate a new join code for your campaign. This will invalidate the current code.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="share" className="space-y-4">
          {campaign.isPublished ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Campaign Join Link</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Share this link with players to invite them to your campaign
                    </p>
                    
                    <div className="flex">
                      <Input
                        readOnly
                        value={`${window.location.origin}/join-campaign?code=${deploymentCode}`}
                        className="rounded-r-none bg-muted"
                      />
                      <Button
                        onClick={copyJoinLink}
                        variant="secondary"
                        className="rounded-l-none"
                      >
                        {hasCopied ? (
                          <span className="flex items-center">
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {isPrivate && (
                    <div>
                      <h3 className="text-lg font-medium mb-1">Campaign Code</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Players can also join by entering this code manually
                      </p>
                      
                      <div className="flex">
                        <Input
                          readOnly
                          value={deploymentCode}
                          className="rounded-r-none font-mono bg-muted"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(deploymentCode);
                            toast({
                              title: "Code copied!",
                              description: "Campaign code copied to clipboard."
                            });
                          }}
                          variant="secondary"
                          className="rounded-l-none"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Current Players: {campaign.participantCount || 0} / {maxPlayers}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {campaign.isPrivate
                        ? "Only players with the join code can participate in this campaign."
                        : "Anyone can join this campaign without a code."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-muted rounded-lg">
              <Share2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Campaign Not Published</h3>
              <p className="text-center text-muted-foreground mb-4">
                Your campaign needs to be published before it can be shared with other players.
              </p>
              <Button
                onClick={() => publishCampaignMutation.mutate()}
                disabled={publishCampaignMutation.isPending}
              >
                {publishCampaignMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Share2 className="h-4 w-4 mr-2" />
                    Publish Campaign
                  </span>
                )}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}