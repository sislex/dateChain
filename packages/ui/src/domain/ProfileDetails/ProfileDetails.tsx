import { Chip } from "../../components/Chip/Chip";

import styles from "./ProfileDetails.module.css";

export interface ProfileDetailsData {
  name: string;
  age: number;
  bio?: string;
  interests?: string[];
  job?: string;
  school?: string;
  distanceKm?: number;
}

export interface ProfileDetailsProps {
  profile: ProfileDetailsData;
}

export function ProfileDetails({ profile }: ProfileDetailsProps) {
  const { name, age, bio, interests, job, school, distanceKm } = profile;
  return (
    <div className={styles.details}>
      <div>
        <div className={styles.header}>
          <h3 className={styles.name}>{name}</h3>
          <span className={styles.age}>{age}</span>
        </div>
        <div className={styles.meta}>
          {job && <span>{job}</span>}
          {school && <span>{school}</span>}
          {distanceKm != null && <span>{distanceKm} км от вас</span>}
        </div>
      </div>

      {bio && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>О себе</span>
          <p className={styles.bio}>{bio}</p>
        </div>
      )}

      {interests && interests.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Интересы</span>
          <div className={styles.chips}>
            {interests.map((i) => (
              <Chip key={i} interactive={false}>
                {i}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
