import { Activity } from '../communications/activity.entity';
import { Contact } from '../contacts/contact.entity';
import { Deal } from '../deals/deal.entity';
import { CrmDocument } from '../documents/document.entity';
import { Campaign } from '../marketing/campaign.entity';
import { PropertyImage } from '../properties/property-image.entity';
import { Property } from '../properties/property.entity';
import { Setting } from '../settings/setting.entity';
import { Task } from '../tasks/task.entity';
import { User } from '../users/user.entity';
import { Visit } from '../visits/visit.entity';

export const ENTITIES = [
  User,
  Campaign,
  Contact,
  Property,
  PropertyImage,
  Deal,
  Visit,
  Task,
  Activity,
  CrmDocument,
  Setting,
];
